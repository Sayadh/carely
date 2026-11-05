import { LoggerService } from '@nestjs/common';
import { env } from '../config/env';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof LEVELS;

const REDACT = /(password|token|secret|authorization|cookie|passwordHash)/i;

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = REDACT.test(k) ? '[redacted]' : scrub(v, depth + 1);
  return out;
}

/** Structured single-line JSON logger. Never pass request bodies containing care details. */
export function log(level: Level, msg: string, fields: Record<string, unknown> = {}) {
  if (LEVELS[level] < LEVELS[env.LOG_LEVEL] || env.NODE_ENV === 'test') return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg, ...(scrub(fields) as object) });
  if (level === 'error' || level === 'warn') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
}

export class JsonLogger implements LoggerService {
  log(message: unknown, context?: string) {
    log('info', String(message), { context });
  }
  error(message: unknown, trace?: string, context?: string) {
    log('error', String(message), { context, trace });
  }
  warn(message: unknown, context?: string) {
    log('warn', String(message), { context });
  }
  debug(message: unknown, context?: string) {
    log('debug', String(message), { context });
  }
  verbose(message: unknown, context?: string) {
    log('debug', String(message), { context });
  }
}
