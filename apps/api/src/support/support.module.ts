import { Controller, Get, Module, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { supportInquirySchema } from '@carely/shared';
import { PrismaService } from '../common/prisma.service';
import { ApiZodBody, AuthUser, CurrentUser, RateLimit, ZBody } from '../common/http';
import { env } from '../config/env';
import { AppError } from '../common/app-error';

@ApiTags('support')
@Controller()
export class SupportController {
  constructor(private readonly prisma: PrismaService) {}

  /** Persists the inquiry. The response says only that it was stored — no email is claimed to be sent. */
  @Post('support/inquiries')
  @RateLimit('support', 5, 3600)
  @ApiZodBody(supportInquirySchema)
  async create(@CurrentUser() user: AuthUser | undefined, @ZBody(supportInquirySchema) b: z.output<typeof supportInquirySchema>) {
    let requestId: string | null = null;
    if (b.requestId && user) {
      const r = await this.prisma.careRequest.findFirst({ where: { id: b.requestId, OR: [{ customerId: user.id }, { professional: { userId: user.id } }] }, select: { id: true } });
      requestId = r?.id ?? null;
    }
    const row = await this.prisma.supportInquiry.create({
      data: { userId: user?.id ?? null, name: b.name, email: b.email, topic: b.topic, message: b.message, requestId, locale: b.locale },
    });
    return { id: row.id, stored: true };
  }

  @Get('config/public')
  config() {
    return { demoMode: env.DEMO_MODE, acceptedRequestTtlHours: env.ACCEPTED_REQUEST_TTL_HOURS };
  }

  /** Local development inbox (MAIL_DRIVER=database). Disabled in production. */
  @Get('dev/mail')
  async devMail() {
    if (env.NODE_ENV === 'production' || env.MAIL_DRIVER !== 'database') throw new AppError('NOT_FOUND');
    return this.prisma.devMail.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
  }
}

@Module({ controllers: [SupportController] })
export class SupportModule {}
