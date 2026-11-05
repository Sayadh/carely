import { execSync } from 'node:child_process';

/**
 * Non-destructive test setup: apply committed migrations to the dedicated test database and load reference data.
 * Tests create uniquely named records, so no reset is required. Point TEST_DATABASE_URL at a database used only for tests.
 */
export default async function () {
  const url = process.env.TEST_DATABASE_URL ?? 'mysql://carely:carely_dev@localhost:3306/carely_test?connection_limit=10';
  const env = { ...process.env, DATABASE_URL: url, NODE_ENV: 'test' };
  execSync('npx prisma migrate deploy', { env, stdio: 'pipe' });
  execSync('npx ts-node --transpile-only prisma/seed.ts', { env, stdio: 'pipe' });
}
