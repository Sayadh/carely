import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

// Load .env without extra dependencies (Node >= 20.12). Real environment variables take precedence.
const envFile = resolve(process.cwd(), '.env');
if (existsSync(envFile) && process.env.NODE_ENV !== 'test') {
  try {
    process.loadEnvFile(envFile);
  } catch {
    /* ignore malformed file; validation below reports missing values */
  }
}

const bool = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  APP_ORIGIN: z.string().default('http://localhost:3000'),
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  DATABASE_URL: z.string().min(1),
  SESSION_COOKIE_NAME: z.string().default('carely_session'),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  COOKIE_SECURE: bool,
  ACCEPTED_REQUEST_TTL_HOURS: z.coerce.number().int().min(1).max(24 * 30).default(48),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(5).max(24 * 60).default(60),
  JOBS_TOKEN: z.string().default(''),
  MAIL_DRIVER: z.enum(['database', 'console', 'smtp']).default('database'),
  MAIL_FROM: z.string().default('Carely <no-reply@carely.am>'),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().default(465),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v !== 'false'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./var/storage'),
  S3_ENDPOINT: z.string().default(''),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET_PUBLIC: z.string().default(''),
  S3_BUCKET_PRIVATE: z.string().default(''),
  S3_ACCESS_KEY_ID: z.string().default(''),
  S3_SECRET_ACCESS_KEY: z.string().default(''),
  S3_PUBLIC_BASE_URL: z.string().default(''),
  DEMO_MODE: bool,
  /**
   * Legacy direct booking (client → professional accept → client confirm). Off: clients send requests to the Carely
   * team (leads) and professionals never receive them. Kept switchable; existing booking data stays readable.
   */
  DIRECT_REQUESTS_ENABLED: bool,
  /** New-lead alerts for the team; TELEGRAM_CHAT_ID may list several ids, comma-separated. Empty = alerts off. */
  TELEGRAM_BOT_TOKEN: z.string().default(''),
  TELEGRAM_CHAT_ID: z.string().default(''),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('Invalid environment configuration:', parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
    process.exit(1);
  }
  const env = parsed.data;
  if (env.NODE_ENV === 'production') {
    const problems: string[] = [];
    if (!env.COOKIE_SECURE) problems.push('COOKIE_SECURE must be true');
    if (env.MAIL_DRIVER !== 'smtp') problems.push('MAIL_DRIVER must be a production mail driver (database/console are development-only)');
    if (env.DEMO_MODE) problems.push('DEMO_MODE must be false');
    if (env.JOBS_TOKEN.length < 32) problems.push('JOBS_TOKEN must be at least 32 characters');
    if (problems.length) {
      // eslint-disable-next-line no-console
      console.error('Refusing to start in production:\n - ' + problems.join('\n - '));
      process.exit(1);
    }
  }
  return env;
}

export const env: Env = load();
export const appOrigins = env.APP_ORIGIN.split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
export const primaryOrigin = appOrigins[0] ?? 'http://localhost:3000';
