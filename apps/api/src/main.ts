import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { env } from './config/env';
import { AppModule } from './app.module';
import { configureApp, setupOpenApi } from './bootstrap';
import { JsonLogger, log } from './common/logger';

async function main() {
  const app = await NestFactory.create(AppModule, { logger: new JsonLogger(), bufferLogs: true });
  configureApp(app);
  setupOpenApi(app);
  // Passenger (cPanel) passes PORT; it may also be a socket path.
  const port = process.env.PORT && isNaN(Number(process.env.PORT)) ? process.env.PORT : env.PORT;
  await app.listen(port as any);
  log('info', 'api_started', { port, env: env.NODE_ENV });
}

main().catch((e) => {
  log('error', 'api_start_failed', { error: (e as Error).message });
  process.exit(1);
});
