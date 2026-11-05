import { Prisma, type PrismaClient } from '@prisma/client';
import { withDeadlockRetry } from '../requests/locking';

/** How many of the most recent published reviews take part in a professional's rating. */
export const RATING_WINDOW = 50;

export function isValidScore(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5;
}

/**
 * Linearly weighted mean of scores ordered OLDEST → NEWEST.
 * weight(i) = 1 + i / (n - 1) for n ≥ 2 (oldest 1, newest 2); a single score has weight 1.
 * No rounding of intermediate values; returns null when there are no scores.
 * Callers pass at most RATING_WINDOW scores; `n` is always the real count, never a constant.
 */
export function weightedRating(scoresOldestFirst: readonly number[]): number | null {
  const n = scoresOldestFirst.length;
  if (n === 0) return null;
  let sum = 0;
  let weights = 0;
  for (let i = 0; i < n; i++) {
    const s = scoresOldestFirst[i];
    if (!isValidScore(s)) throw new RangeError(`Invalid rating score at index ${i}: ${String(s)}`);
    const w = n === 1 ? 1 : 1 + i / (n - 1);
    sum += s * w;
    weights += w;
  }
  return sum / weights;
}

/** Display/API value: two decimals (4.9254… → 4.93). Only the final result is rounded. */
export function roundRating(v: number | null): number | null {
  return v == null ? null : Math.round((v + Number.EPSILON) * 100) / 100;
}

export interface RatingSnapshot {
  rating: number | null; // unrounded weighted mean
  ratingCount: number; // reviews used in the calculation (≤ RATING_WINDOW)
  totalReviewCount: number; // all published reviews
}

/**
 * Recomputes and stores a professional's rating — the single authoritative path.
 * Must run inside the transaction that changed the reviews.
 *
 * Concurrency: the profile row is locked FOR UPDATE first, so recomputations for one professional are serialized.
 * Reviews are then read with a locking read, which returns the latest committed rows regardless of the
 * transaction's snapshot/isolation level — the last writer therefore always stores a result that includes
 * every committed change. Callers that modify reviews must take the profile lock BEFORE touching review rows
 * (see `lockProfileForRating`) to keep a single lock order (profile → reviews).
 */
/**
 * Every transaction that changes reviews or stored ratings must run through here.
 *
 * READ COMMITTED: the protocol relies on locking reads seeing the latest committed rows. Under REPEATABLE READ,
 * MariaDB ≥ 11.8 (innodb_snapshot_isolation=ON by default) rejects a locking read of a row changed after the
 * transaction's snapshot with error 1020 — e.g. moderation reads the review, then locks a profile another
 * moderation just updated. Conflicts that still occur (deadlock, lock wait, 1020) are retried.
 */
export const RATING_TX_OPTIONS = { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15_000, maxWait: 10_000 } as const;

export function ratingTransaction<T>(prisma: PrismaClient, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return withDeadlockRetry(() => prisma.$transaction(fn, RATING_TX_OPTIONS));
}

export async function lockProfileForRating(tx: Prisma.TransactionClient, profileId: string) {
  await tx.$queryRaw`SELECT id FROM \`ProfessionalProfile\` WHERE id = ${profileId} FOR UPDATE`;
}

export async function recomputeProfessionalRating(tx: Prisma.TransactionClient, profileId: string): Promise<RatingSnapshot> {
  await lockProfileForRating(tx, profileId);
  // Original creation order (createdAt, then id for ties); updatedAt is never used, so edits keep their position.
  const newestFirst = await tx.$queryRaw<{ rating: number }[]>`
    SELECT rating FROM \`Review\`
    WHERE profileId = ${profileId} AND status = 'PUBLISHED'
    ORDER BY createdAt DESC, id DESC
    LIMIT ${RATING_WINDOW}
    LOCK IN SHARE MODE`;
  const [{ total }] = await tx.$queryRaw<{ total: bigint | number }[]>`
    SELECT COUNT(*) AS total FROM \`Review\`
    WHERE profileId = ${profileId} AND status = 'PUBLISHED'
    LOCK IN SHARE MODE`;
  const scores = newestFirst.map((r) => Number(r.rating)).reverse();
  const snapshot: RatingSnapshot = { rating: weightedRating(scores), ratingCount: scores.length, totalReviewCount: Number(total) };
  await tx.professionalProfile.update({
    where: { id: profileId },
    data: { ratingValue: snapshot.rating, ratingCount: snapshot.ratingCount, totalReviewCount: snapshot.totalReviewCount },
  });
  return snapshot;
}
