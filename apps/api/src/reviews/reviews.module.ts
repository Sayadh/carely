import { Controller, Injectable, Module, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Prisma, ReviewStatus } from '@prisma/client';
import { z } from 'zod';
import { createReviewSchema } from '@carely/shared';
import { PrismaService } from '../common/prisma.service';
import { AppError } from '../common/app-error';
import { ApiZodBody, Auth, AuthUser, CurrentUser, RateLimit, ZBody } from '../common/http';
import { NotificationsService } from '../notifications/notifications.module';
import { lockProfileForRating, ratingTransaction, recomputeProfessionalRating } from './rating';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** One review per COMPLETED request, by its customer only. Starts PENDING moderation. */
  async create(user: AuthUser, input: z.output<typeof createReviewSchema>) {
    const r = await this.prisma.careRequest.findUnique({ where: { id: input.requestId }, include: { professional: { select: { userId: true } }, review: true } });
    if (!r || r.customerId !== user.id) throw new AppError('REVIEW_NOT_ELIGIBLE');
    if (r.status !== 'COMPLETED') throw new AppError('REVIEW_NOT_ELIGIBLE');
    if (r.professional.userId === user.id) throw new AppError('REVIEW_NOT_ELIGIBLE');
    if (r.review) throw new AppError('REVIEW_EXISTS');
    try {
      const review = await ratingTransaction(this.prisma, async (tx) => {
        await lockProfileForRating(tx, r.professionalId);
        const created = await tx.review.create({
          data: { requestId: r.id, customerId: user.id, profileId: r.professionalId, rating: input.rating, body: input.body, contactPhone: input.contactPhone, locale: input.locale },
        });
        // New reviews start PENDING and do not count yet; recomputing keeps a single update path for every review change.
        await recomputeProfessionalRating(tx, r.professionalId);
        return created;
      });
      return { id: review.id, status: review.status };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new AppError('REVIEW_EXISTS');
      throw e;
    }
  }

  /**
   * Status change + rating recomputation in one transaction. Lock order: profile → review (same as recomputation),
   * and the conditional update guards against a concurrent moderation of the same review.
   * The caller's transaction must be opened with `ratingTransaction` (READ COMMITTED + retry).
   */
  async moderate(reviewId: string, status: ReviewStatus, adminId: string, note: string, tx: Prisma.TransactionClient) {
    const found = await tx.review.findUnique({ where: { id: reviewId }, select: { profileId: true } });
    if (!found) throw new AppError('NOT_FOUND');
    await lockProfileForRating(tx, found.profileId);
    const review = await tx.review.findUniqueOrThrow({ where: { id: reviewId } });
    if (review.status === status) return review;
    const res = await tx.review.updateMany({
      where: { id: reviewId, status: review.status },
      data: { status, moderatedAt: new Date(), moderatedBy: adminId, moderationNote: note || null },
    });
    if (res.count !== 1) throw new AppError('CONFLICT');
    // Recompute whenever publication changes: a review leaving PUBLISHED lets the next most recent one back into the window.
    await recomputeProfessionalRating(tx, review.profileId);
    await this.notifications.notify(review.customerId, status === 'PUBLISHED' ? 'REVIEW_PUBLISHED' : 'REVIEW_REJECTED', { reviewId }, tx);
    return review;
  }
}

/** Rebuilds stored ratings for a bounded batch of profiles whose totals are out of date (backfill / safety net). */
export async function healStaleRatings(prisma: PrismaService, limit = 200) {
  const stale = await prisma.$queryRaw<{ id: string }[]>`
    SELECT p.id FROM \`ProfessionalProfile\` p
    LEFT JOIN \`Review\` r ON r.profileId = p.id AND r.status = 'PUBLISHED'
    GROUP BY p.id, p.totalReviewCount
    HAVING COUNT(r.id) <> p.totalReviewCount
    ORDER BY p.id
    LIMIT ${limit}`;
  for (const { id } of stale) await ratingTransaction(prisma, (tx) => recomputeProfessionalRating(tx, id));
  return stale.length;
}

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Post()
  @Auth()
  @RateLimit('review', 20, 3600)
  @ApiZodBody(createReviewSchema)
  create(@CurrentUser() u: AuthUser, @ZBody(createReviewSchema) b: z.output<typeof createReviewSchema>) {
    return this.service.create(u, b);
  }
}

@Module({ controllers: [ReviewsController], providers: [ReviewsService], exports: [ReviewsService] })
export class ReviewsModule {}
