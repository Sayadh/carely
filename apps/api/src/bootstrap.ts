import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { env } from './config/env';

/** Shared HTTP configuration for the server and the e2e tests. */
export function configureApp(app: INestApplication) {
  const express = app as NestExpressApplication;
  express.set('trust proxy', env.TRUST_PROXY);
  express.disable('x-powered-by');
  app.setGlobalPrefix('api');
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cookieParser());
  app.use(json({ limit: '200kb' }));
  app.use(urlencoded({ extended: false, limit: '50kb' }));
  // No CORS: the web app proxies /api on the same origin. Cross-origin browsers are refused by default.
  app.enableShutdownHooks();
}

export function setupOpenApi(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Carely API')
    .setDescription('Care-services marketplace API. Cookie session auth; mutations require header `x-carely-csrf: 1`. Errors: `{ error: { code, params?, fields?, requestId } }`.')
    .setVersion('0.1.0')
    .addCookieAuth(env.SESSION_COOKIE_NAME)
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, doc, { jsonDocumentUrl: 'api/openapi.json' });
}
