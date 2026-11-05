/**
 * Passenger startup file for the Carely website (cPanel → Setup Node.js App → Application startup file: app.js).
 *
 * The Nuxt/Nitro server is an ES module (.output/server/index.mjs); Passenger loads this CommonJS file, so it is
 * started with a dynamic import. Nitro does not read `.env` in production, so the server-only settings are loaded
 * from this application root first (variables already set in the cPanel app settings take precedence).
 */
const { existsSync } = require('node:fs');
const { join } = require('node:path');

process.chdir(__dirname);
const envFile = join(__dirname, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

import('./.output/server/index.mjs').catch((error) => {
  console.error('Carely web failed to start:', error);
  process.exit(1);
});
