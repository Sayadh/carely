import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '../common/prisma.service';
import { AppError } from '../common/app-error';
import { AUTH_KEY, AuthLevel, AuthUser } from '../common/http';
import { env } from '../config/env';
import { sha256 } from './crypto';

/** Global guard: resolves the session cookie (if any) and enforces @Auth() metadata. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const level = this.reflector.getAllAndOverride<AuthLevel | undefined>(AUTH_KEY, [ctx.getHandler(), ctx.getClass()]);
    const token = req.cookies?.[env.SESSION_COOKIE_NAME];

    if (typeof token === 'string' && token.length >= 20 && token.length <= 100) {
      const session = await this.prisma.session.findUnique({
        where: { tokenHash: sha256(token) },
        include: { user: { select: { id: true, email: true, name: true, isAdmin: true, locale: true, status: true } } },
      });
      if (session && session.expiresAt > new Date() && session.user.status === 'ACTIVE') {
        req.user = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          isAdmin: session.user.isAdmin,
          locale: session.user.locale,
          sessionId: session.id,
        };
        // Touch at most every 10 minutes to limit writes.
        if (Date.now() - session.lastSeenAt.getTime() > 10 * 60 * 1000) {
          await this.prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
        }
      }
    }

    if (!level) return true;
    if (!req.user) throw new AppError('UNAUTHENTICATED');
    if (level === 'admin' && !req.user.isAdmin) throw new AppError('FORBIDDEN');
    return true;
  }
}
