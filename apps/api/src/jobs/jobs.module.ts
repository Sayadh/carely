import { Controller, Get, Headers, HttpCode, Injectable, Module, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../common/prisma.service';
import { AppError } from '../common/app-error';
import { SkipCsrf } from '../common/http';
import { env } from '../config/env';
import { log } from '../common/logger';
import { RequestsModule, RequestsService } from '../requests/requests.module';
import { healStaleRatings } from '../reviews/reviews.module';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requests: RequestsService,
  ) {}

  /** Bounded maintenance batch. Safe to run repeatedly (cron every 5–15 minutes). */
  async run() {
    const now = new Date();
    const expiredRequests = await this.requests.expireDue({ limit: 500 });
    const sessions = await this.prisma.session.deleteMany({ where: { expiresAt: { lt: now } } });
    const tokens = await this.prisma.passwordResetToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: new Date(now.getTime() - 86400_000) } }, { usedAt: { lt: new Date(now.getTime() - 86400_000) } }] },
    });
    const devMail = await this.prisma.devMail.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 7 * 86400_000) } } });
    const ratingsRebuilt = await healStaleRatings(this.prisma);
    const result = { expiredRequests, ratingsRebuilt, sessions: sessions.count, resetTokens: tokens.count, devMail: devMail.count, ranAt: now.toISOString() };
    log('info', 'jobs_run', result);
    return result;
  }
}

@ApiTags('ops')
@Controller()
export class JobsController {
  constructor(
    private readonly jobs: JobsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('internal/jobs/run')
  @HttpCode(200)
  @SkipCsrf()
  async run(@Headers('x-jobs-token') token?: string) {
    const expected = Buffer.from(env.JOBS_TOKEN);
    const given = Buffer.from(token ?? '');
    if (!env.JOBS_TOKEN || expected.length !== given.length || !timingSafeEqual(expected, given)) throw new AppError('FORBIDDEN');
    return this.jobs.run();
  }

  @Get('health')
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', time: new Date().toISOString() };
  }
}

@Module({ imports: [RequestsModule], controllers: [JobsController], providers: [JobsService], exports: [JobsService] })
export class JobsModule {}
