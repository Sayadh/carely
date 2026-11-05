import {
  ArgumentsHost,
  CallHandler,
  CanActivate,
  Catch,
  ExceptionFilter,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
  NestMiddleware,
  PipeTransform,
  SetMetadata,
  applyDecorators,
  createParamDecorator,
  Body,
  Query,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiBody, ApiQuery } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Observable, tap } from 'rxjs';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from './app-error';
import { log } from './logger';
import { appOrigins } from '../config/env';

// ───────── Request ID ─────────
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
    (req as any).requestId = id;
    res.setHeader('x-request-id', id);
    next();
  }
}

@Injectable()
export class AccessLogInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const started = Date.now();
    return next.handle().pipe(
      tap({
        next: () => {
          const res = ctx.switchToHttp().getResponse<Response>();
          log('info', 'request', { requestId: (req as any).requestId, method: req.method, path: req.route?.path ?? req.path, status: res.statusCode, ms: Date.now() - started });
        },
      }),
    );
  }
}

// ───────── Errors ─────────
function zodFields(error: z.ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    const msg = /^[a-z_]+$/.test(issue.message) ? issue.message : issue.code === 'invalid_type' ? 'required' : issue.code === 'too_big' ? 'too_long' : 'invalid';
    (fields[key] ??= []).push(msg);
  }
  return fields;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const requestId = (req as any).requestId as string | undefined;

    let status = 500;
    let body: any = { code: 'INTERNAL' };

    if (exception instanceof AppError) {
      status = exception.getStatus();
      body = { code: exception.code, params: exception.params, fields: exception.fields };
    } else if (exception instanceof z.ZodError) {
      status = 400;
      body = { code: 'VALIDATION_FAILED', fields: zodFields(exception) };
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2002') {
      status = 409;
      body = { code: 'CONFLICT' };
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2025') {
      status = 404;
      body = { code: 'NOT_FOUND' };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const map: Record<number, string> = { 400: 'VALIDATION_FAILED', 401: 'UNAUTHENTICATED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 413: 'FILE_TOO_LARGE', 429: 'RATE_LIMITED' };
      body = { code: map[status] ?? (status >= 500 ? 'INTERNAL' : 'CONFLICT') };
    }

    if (status >= 500) {
      log('error', 'unhandled_error', {
        requestId,
        path: req.path,
        error: exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack?.split('\n').slice(0, 6).join(' | ') : undefined,
      });
    }
    res.status(status).json({ error: { ...body, requestId } });
  }
}

// ───────── Validation ─────────
export class ZodPipe implements PipeTransform {
  constructor(private readonly schema: z.ZodType) {}
  transform(value: unknown) {
    const r = this.schema.safeParse(value ?? {});
    if (!r.success) throw new AppError('VALIDATION_FAILED', undefined, zodFields(r.error));
    return r.data;
  }
}

function jsonSchema(schema: z.ZodType): any {
  try {
    return z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });
  } catch {
    return { type: 'object' };
  }
}

/** Validated body + OpenAPI schema generated from the shared zod schema. */
export const ZBody = (schema: z.ZodType) => Body(new ZodPipe(schema));
export const ApiZodBody = (schema: z.ZodType) => ApiBody({ schema: jsonSchema(schema) });
export const ZQuery = (schema: z.ZodType) => Query(new ZodPipe(schema));
export const ApiZodQuery = (schema: z.ZodType) => {
  const js = jsonSchema(schema);
  const props = Object.entries<any>(js.properties ?? {});
  return applyDecorators(...props.map(([name, s]) => ApiQuery({ name, required: false, schema: s })));
};

// ───────── Auth metadata ─────────
export type AuthLevel = 'user' | 'admin';
export const AUTH_KEY = 'carely:auth';
export const Auth = (level: AuthLevel = 'user') => SetMetadata(AUTH_KEY, level);

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  locale: 'hy' | 'ru' | 'en';
  sessionId: string;
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user as AuthUser | undefined);
export const ClientIp = createParamDecorator((_: unknown, ctx: ExecutionContext) => (ctx.switchToHttp().getRequest() as Request).ip ?? null);

// ───────── CSRF ─────────
export const SKIP_CSRF = 'carely:skip-csrf';
export const SkipCsrf = () => SetMetadata(SKIP_CSRF, true);

/**
 * Cookie-authenticated mutations require a custom header (cannot be sent cross-site without a CORS preflight,
 * which this API never grants) and, when the browser sends an Origin, an allowed origin.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
    if (this.reflector.getAllAndOverride<boolean>(SKIP_CSRF, [ctx.getHandler(), ctx.getClass()])) return true;
    if (req.headers['x-carely-csrf'] !== '1') throw new AppError('CSRF_FAILED');
    const origin = req.headers.origin;
    if (origin && !appOrigins.includes(origin.replace(/\/$/, ''))) throw new AppError('CSRF_FAILED');
    return true;
  }
}

// ───────── Rate limiting (in-process, fixed window) ─────────
export const RATE_KEY = 'carely:rate';
export const RateLimit = (bucket: string, limit: number, windowSec: number) => SetMetadata(RATE_KEY, { bucket, limit, windowSec });

const hits = new Map<string, { count: number; resetAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
}, 60_000).unref();

export function consumeRate(key: string, limit: number, windowSec: number): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}
export function resetRateLimits() {
  hits.clear();
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const cfg = this.reflector.getAllAndOverride<{ bucket: string; limit: number; windowSec: number }>(RATE_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!cfg) return true;
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!consumeRate(`${cfg.bucket}:${req.ip}`, cfg.limit, cfg.windowSec)) throw new AppError('RATE_LIMITED');
    return true;
  }
}

// ───────── Pagination ─────────
export function paginate<T>(items: T[], total: number, page: number, pageSize: number) {
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}
