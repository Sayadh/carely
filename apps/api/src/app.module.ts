import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './common/prisma.service';
import { AccessLogInterceptor, AllExceptionsFilter, CsrfGuard, RateLimitGuard, RequestIdMiddleware } from './common/http';
import { SessionGuard } from './auth/session.guard';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.service';
import { NotificationsModule } from './notifications/notifications.module';
import { TaxonomyModule } from './taxonomy/taxonomy.module';
import { MediaModule } from './media/media.module';
import { ProfessionalsModule } from './professionals/professionals.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { RequestsModule } from './requests/requests.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SupportModule } from './support/support.module';
import { LeadsModule } from './leads/leads.module';
import { AdminModule } from './admin/admin.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    NotificationsModule,
    AuthModule,
    TaxonomyModule,
    MediaModule,
    ProfessionalsModule,
    OnboardingModule,
    RequestsModule,
    ReviewsModule,
    SupportModule,
    LeadsModule,
    AdminModule,
    JobsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: AccessLogInterceptor },
    // Order matters: rate limit → CSRF → session/authorization
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*path');
  }
}
