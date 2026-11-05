import { Controller, Get, Global, Injectable, Module, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import type { NotificationDto, NotificationType } from '@carely/shared';
import { PrismaService } from '../common/prisma.service';
import { Auth, AuthUser, CurrentUser, paginate } from '../common/http';

type Tx = Prisma.TransactionClient | PrismaService;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Persist a typed notification; the web app renders it in the reader's language from type + params. */
  async notify(userId: string, type: NotificationType, params: Record<string, string | number>, tx: Tx = this.prisma) {
    await tx.notification.create({ data: { userId, type, params } });
  }

  async list(userId: string, page: number) {
    const pageSize = 20;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    const dto: NotificationDto[] = items.map((n) => ({
      id: n.id,
      type: n.type as NotificationType,
      params: (n.params ?? {}) as Record<string, string | number>,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    }));
    return paginate(dto, total, page, pageSize);
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }
}

@ApiTags('notifications')
@Controller('notifications')
@Auth()
export class NotificationsController {
  constructor(
    private readonly service: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('page') page?: string) {
    return this.service.list(user.id, Math.max(1, Math.min(1000, Number(page) || 1)));
  }

  @Get('unread-count')
  async unread(@CurrentUser() user: AuthUser) {
    return { count: await this.service.unreadCount(user.id) };
  }

  @Post(':id/read')
  async read(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.prisma.notification.updateMany({ where: { id, userId: user.id, readAt: null }, data: { readAt: new Date() } });
    return { ok: true };
  }

  @Post('read-all')
  async readAll(@CurrentUser() user: AuthUser) {
    await this.prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
    return { ok: true };
  }
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}
  async record(actorId: string | null, action: string, entityType: string, entityId: string, meta?: Record<string, unknown>, ip?: string | null, tx: Tx = this.prisma) {
    await tx.auditLog.create({ data: { actorId, action, entityType, entityId, meta: (meta ?? undefined) as any, ip: ip ?? null } });
  }
}

@Global()
@Module({ controllers: [NotificationsController], providers: [NotificationsService, AuditService], exports: [NotificationsService, AuditService] })
export class NotificationsModule {}
