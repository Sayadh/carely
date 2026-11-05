/**
 * Passenger startup file for the Carely API (cPanel → Setup Node.js App → Application startup file: app.js).
 *
 * Passenger loads this CommonJS file and takes over `listen()`, so the port is chosen by Passenger. Everything the
 * API reads relative to the working directory — `.env`, `var/storage`, `prisma/` — lives in this application root,
 * which is outside the domain's public Document Root.
 */
process.chdir(__dirname);
require('./dist/main.js');
