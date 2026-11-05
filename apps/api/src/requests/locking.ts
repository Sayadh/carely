import { Prisma } from '@prisma/client';
import { log } from '../common/logger';

/**
 * Retryable: InnoDB deadlock (1213), lock wait timeout (1205), Prisma write conflict (P2034) and
 * MariaDB ≥ 11.8 snapshot-isolation conflict (1020 "Record has changed since last read").
 */
export function isRetryable(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2034') return true;
    if (e.code === 'P2010' && /1213|1205|1020|Deadlock|Lock wait|Record has changed/i.test(JSON.stringify(e.meta ?? {}) + e.message)) return true;
  }
  const msg = e instanceof Error ? e.message : String(e);
  return /Deadlock found|Lock wait timeout|Record has changed since last read|`1213`|`1205`|`1020`/.test(msg);
}

export async function withDeadlockRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      if (!isRetryable(e) || i === attempts - 1) throw e;
      last = e;
      log('warn', 'tx_retry', { attempt: i + 1 });
      await new Promise((r) => setTimeout(r, 20 + Math.random() * 60 * (i + 1)));
    }
  }
  throw last;
}

/**
 * Locking protocol used by every path that creates or frees booking occurrences:
 *   1. lock the professional row (serializes all confirmations for that professional),
 *   2. lock the request row and re-read its state,
 *   3. read overlapping ACTIVE occurrences with a locking read, then insert — all in one transaction.
 */
export async function lockProfessional(tx: Prisma.TransactionClient, professionalId: string) {
  await tx.$queryRaw`SELECT id FROM \`ProfessionalProfile\` WHERE id = ${professionalId} FOR UPDATE`;
}

export async function lockRequest(tx: Prisma.TransactionClient, requestId: string) {
  await tx.$queryRaw`SELECT id FROM \`CareRequest\` WHERE id = ${requestId} FOR UPDATE`;
}

export async function lockingOverlaps(tx: Prisma.TransactionClient, professionalId: string, from: Date, to: Date) {
  return tx.$queryRaw<{ id: string; startAt: Date; endAt: Date }[]>`
    SELECT id, startAt, endAt FROM \`BookingOccurrence\`
    WHERE professionalId = ${professionalId} AND status = 'ACTIVE' AND startAt < ${to} AND endAt > ${from}
    FOR UPDATE`;
}
