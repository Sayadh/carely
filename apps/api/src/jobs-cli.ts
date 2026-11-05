import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { JobsService } from './jobs/jobs.module';

/** cPanel cron entry point: `cd ~/carely/apps/api && node dist/jobs-cli.js` */
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const result = await app.get(JobsService).run();
    process.stdout.write(JSON.stringify(result) + '\n');
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  process.stderr.write(String(e?.stack ?? e) + '\n');
  process.exit(1);
});
