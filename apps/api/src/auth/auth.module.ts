import { Controller, Get, HttpCode, Injectable, Module, Patch, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateAccountSchema,
  type SessionUserDto,
  type Locale,
} from '@carely/shared';
import { z } from 'zod';
import { PrismaService } from '../common/prisma.service';
import { AppError } from '../common/app-error';
import { ApiZodBody, Auth, AuthUser, ClientIp, consumeRate, CurrentUser, RateLimit, ZBody } from '../common/http';
import { env, primaryOrigin } from '../config/env';
import { MailService } from '../mail/mail.service';
import { DUMMY_HASH, hashPassword, newToken, sha256, verifyPassword } from './crypto';
import { log } from '../common/logger';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async createSession(userId: string, ip: string | null, userAgent: string | undefined) {
    const { token, hash } = newToken();
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 86400_000);
    await this.prisma.session.create({ data: { tokenHash: hash, userId, expiresAt, ip, userAgent: userAgent?.slice(0, 255) } });
    return { token, expiresAt };
  }

  setCookie(res: Response, token: string, expiresAt: Date) {
    res.cookie(env.SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });
  }

  clearCookie(res: Response) {
    res.clearCookie(env.SESSION_COOKIE_NAME, { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: 'lax', path: '/' });
  }

  async register(input: z.output<typeof registerSchema>) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (existing) throw new AppError('EMAIL_TAKEN', undefined, { email: ['email_taken'] });
    const user = await this.prisma.user.create({
      data: { email: input.email, name: input.name, phone: input.phone ?? null, locale: input.locale, passwordHash: await hashPassword(input.password) },
    });
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw new AppError('INVALID_CREDENTIALS');
    if (user.status !== 'ACTIVE') throw new AppError('ACCOUNT_SUSPENDED');
    return user;
  }

  /** Always resolves the same way to avoid revealing whether the email exists. */
  async requestReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== 'ACTIVE') return;
    const { token, hash } = newToken();
    await this.prisma.$transaction([
      // Invalidate earlier unused tokens for this user.
      this.prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
      this.prisma.passwordResetToken.create({
        data: { tokenHash: hash, userId: user.id, expiresAt: new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60_000) },
      }),
    ]);
    const link = `${primaryOrigin}/${user.locale}/auth/reset-password?token=${encodeURIComponent(token)}`;
    try {
      await this.mail.send(user.email, user.locale as Locale, 'password_reset', { name: user.name, link, minutes: String(env.PASSWORD_RESET_TTL_MINUTES) });
    } catch (e) {
      log('error', 'password_reset_mail_failed', { error: (e as Error).message });
    }
  }

  async resetPassword(token: string, password: string) {
    const hash = sha256(token);
    const passwordHash = await hashPassword(password);
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.passwordResetToken.findUnique({ where: { tokenHash: hash } });
      if (!row || row.usedAt || row.expiresAt < new Date()) throw new AppError('RESET_TOKEN_INVALID');
      // Conditional update guarantees single use even under concurrent submissions.
      const consumed = await tx.passwordResetToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
      if (consumed.count !== 1) throw new AppError('RESET_TOKEN_INVALID');
      await tx.user.update({ where: { id: row.userId }, data: { passwordHash } });
      await tx.session.deleteMany({ where: { userId: row.userId } });
    });
  }

  async me(userId: string): Promise<SessionUserDto> {
    const u = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { professional: { select: { id: true, slug: true, status: true } } },
    });
    const unread = await this.prisma.notification.count({ where: { userId, readAt: null } });
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      phoneVerified: false,
      locale: u.locale,
      isAdmin: u.isAdmin,
      professional: u.professional,
      unreadNotifications: unread,
    };
  }
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('register')
  @RateLimit('register', 10, 3600)
  @ApiZodBody(registerSchema)
  async register(@ZBody(registerSchema) body: z.output<typeof registerSchema>, @Req() req: Request, @Res({ passthrough: true }) res: Response, @ClientIp() ip: string | null) {
    const user = await this.auth.register(body);
    const s = await this.auth.createSession(user.id, ip, req.headers['user-agent']);
    this.auth.setCookie(res, s.token, s.expiresAt);
    return this.auth.me(user.id);
  }

  @Post('login')
  @HttpCode(200)
  @RateLimit('login-ip', 30, 900)
  @ApiZodBody(loginSchema)
  async login(@ZBody(loginSchema) body: z.output<typeof loginSchema>, @Req() req: Request, @Res({ passthrough: true }) res: Response, @ClientIp() ip: string | null) {
    if (!consumeRate(`login-email:${body.email}`, 8, 900)) throw new AppError('RATE_LIMITED');
    const user = await this.auth.login(body.email, body.password);
    const s = await this.auth.createSession(user.id, ip, req.headers['user-agent']);
    this.auth.setCookie(res, s.token, s.expiresAt);
    return this.auth.me(user.id);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@CurrentUser() user: AuthUser | undefined, @Res({ passthrough: true }) res: Response) {
    if (user) await this.prisma.session.deleteMany({ where: { id: user.sessionId } });
    this.auth.clearCookie(res);
    return { ok: true };
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser | undefined) {
    return { user: user ? await this.auth.me(user.id) : null };
  }

  @Post('forgot-password')
  @HttpCode(202)
  @RateLimit('forgot', 5, 900)
  @ApiZodBody(forgotPasswordSchema)
  async forgot(@ZBody(forgotPasswordSchema) body: z.output<typeof forgotPasswordSchema>) {
    if (consumeRate(`forgot-email:${body.email}`, 3, 3600)) await this.auth.requestReset(body.email);
    return { ok: true };
  }

  @Post('reset-password')
  @HttpCode(200)
  @RateLimit('reset', 10, 900)
  @ApiZodBody(resetPasswordSchema)
  async reset(@ZBody(resetPasswordSchema) body: z.output<typeof resetPasswordSchema>) {
    await this.auth.resetPassword(body.token, body.password);
    return { ok: true };
  }

  @Post('change-password')
  @HttpCode(200)
  @Auth()
  @RateLimit('change-password', 10, 900)
  @ApiZodBody(changePasswordSchema)
  async changePassword(@CurrentUser() user: AuthUser, @ZBody(changePasswordSchema) body: z.output<typeof changePasswordSchema>) {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await verifyPassword(body.currentPassword, u.passwordHash))) throw new AppError('INVALID_CREDENTIALS', undefined, { currentPassword: ['password_wrong'] });
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(body.newPassword) } }),
      this.prisma.session.deleteMany({ where: { userId: user.id, NOT: { id: user.sessionId } } }),
    ]);
    return { ok: true };
  }

  @Patch('account')
  @Auth()
  @ApiZodBody(updateAccountSchema)
  async updateAccount(@CurrentUser() user: AuthUser, @ZBody(updateAccountSchema) body: z.output<typeof updateAccountSchema>) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { name: body.name, locale: body.locale, phone: body.phone === undefined ? undefined : body.phone },
    });
    return this.auth.me(user.id);
  }
}

@Module({ controllers: [AuthController], providers: [AuthService], exports: [AuthService] })
export class AuthModule {}
