# Deployment — cPanel shared hosting (HayHost, Passenger)

Verified locally against the production release: MariaDB **10.6.24** (all migrations + 69 API tests), Node **22.23.4**,
both `app.js` startup files, `.env` loading, proxy secret (API answers 403 without it), seed, jobs, lead submission.
Measured memory: API ≈ 110 MB, website ≈ 165 MB. The same layout (Nuxt + NestJS under Passenger) already runs SEA
Furniture on this account.

## Layout on the hosting (isolated from any other site on the account)

| What | Where | Public? |
|---|---|---|
| API app root (code, `.env`, uploads) | `/home/<user>/carely_api` | no |
| Website app root (Nitro server, `.env`) | `/home/<user>/carely_web` | no |
| Domain document roots (only `.htaccess`) | `/home/<user>/carely.am`, `/home/<user>/api.carely.am` | yes |
| Uploaded portraits / documents | `/home/<user>/carely_api/var/storage` | no (served through the API) |
| Database | `<user>_carely` (own DB user) | no |

cPanel → Setup Node.js App: API → root `carely_api`, URL `api.carely.am`; website → root `carely_web`, URL `carely.am`;
Node 22, Production, **Application startup file `app.js`** for both.

The browser only talks to `https://carely.am`; the website's server forwards `/api/*` to `https://api.carely.am` with a
shared secret (`PROXY_SECRET` = `NUXT_API_PROXY_SECRET`). No CORS is needed and the session cookie stays first-party.
Everything else on `api.carely.am` answers 403, except `/api/health`.

## 1. Build the release (on your computer)
```bash
npm ci                     # first time / after dependency changes
npm run release:cpanel     # = node scripts/release-cpanel.mjs
```
Creates `release/carely_api-<stamp>.zip` and `release/carely_web-<stamp>.zip` (no secrets inside).
`carely_api` contains `app.js`, `dist/`, `dist-seed/`, `prisma/` (schema + migrations), `vendor/carely-shared-*.tgz`,
`package.json`, `.env.example`. `carely_web` contains `app.js`, `.output/`, `package.json`, `.env.example`.

## 2. Upload
cPanel → File Manager → open the app root → Upload the matching zip → Extract (overwrite) → delete the zip.
Do not upload into the domain document roots.

## 3. Configuration (server only)
- `carely_api/.env` from `.env.example`: `DATABASE_URL` (URL-encode special characters in the password),
  `PROXY_SECRET` and `JOBS_TOKEN` (generate: `openssl rand -hex 32`), SMTP, Telegram.
- `carely_web/.env` from `.env.example`: `NUXT_API_PROXY_SECRET` = the API's `PROXY_SECRET`.
Use Carely-only secrets; never copy values from another site.

## 4. Install, migrate, seed (API only)
Setup Node.js App → carely_api → **Run NPM Install**. Then, in Terminal/SSH, run the "enter the virtual environment"
command shown at the top of the app page (copy it from there), and:
```bash
npx prisma generate      # Prisma engine for this server
npm run db:status
npm run db:migrate       # prisma migrate deploy — committed migrations only; back up first on later deploys
npm run db:seed          # categories/services/filters + locations; run after every deploy (idempotent)
```
Without a terminal, the app page's "Run JS script" runs the same `package.json` scripts (`prisma:generate`,
`db:status`, `db:migrate`, `db:seed`). Never run `prisma migrate dev/reset` or the demo seed in production.
The website needs no npm install.

## 5. Start / restart only Carely
Setup Node.js App → carely_api / carely_web → **Restart** (or `touch tmp/restart.txt` inside that app root).

## 6. HTTPS and www redirects
Add at the top of `/home/<user>/carely.am/.htaccess`, above the `CLOUDLINUX PASSENGER CONFIGURATION` block
(never edit inside that block):
```apache
RewriteEngine On
RewriteCond %{HTTPS} !=on [OR]
RewriteCond %{HTTP_HOST} ^www\. [NC]
RewriteRule ^ https://carely.am%{REQUEST_URI} [L,R=301]
```
and at the top of `/home/<user>/api.carely.am/.htaccess`:
```apache
RewriteEngine On
RewriteCond %{HTTPS} !=on
RewriteRule ^ https://api.carely.am%{REQUEST_URI} [L,R=301]
```

## 7. Checks
- `https://api.carely.am/api/health` → `{"status":"ok",…}` (DB reachable)
- `https://api.carely.am/api/taxonomy/categories` → 403 (private API)
- `https://carely.am/api/taxonomy/categories` → JSON (through the website)
- `https://carely.am/hy`, `/ru`, `/en` load; send a test request → Telegram alert, admin → Հայտեր
- Logs: the app pages' log file / `stderr.log` in each app root; API logs are JSON lines.

First admin: register on the site, then phpMyAdmin → `UPDATE User SET isAdmin = 1 WHERE email = '…';`

## 8. Cron (every 10 minutes)
Use the Node binary of the API's virtual environment (the activation command's `…/bin/activate` → `…/bin/node`):
```
*/10 * * * * cd /home/<user>/carely_api && /home/<user>/nodevenv/carely_api/22/bin/node dist/jobs-cli.js >> /home/<user>/carely_api/var/jobs.log 2>&1
```
(confirm the path from your activation command before saving).

## 9. Updating
Build a new release → back up the DB → upload/extract over the app roots (keep `.env` and `var/`) → if
`package.json` changed: Run NPM Install + `npx prisma generate` → `npm run db:migrate` → `npm run db:seed` →
restart both apps → checks (§7).

## 10. Backup, restore, moving to another host
Back up: phpMyAdmin → `<user>_carely` → Export (SQL), or `mysqldump --single-transaction <db> > carely.sql`;
files: `carely_api/var/storage`, `carely_api/.env`, `carely_web/.env`. Keep copies off the hosting.

Move: on the new host create the DB + user and import `carely.sql`; create the two Node apps the same way; upload the
latest release; restore `var/storage` and both `.env` files (update `DATABASE_URL`); install/generate (§4, without
re-running migrations unless the release is newer); restart; point the DNS `A` records of `carely.am`, `www` and
`api` to the new server; re-check §7. Nothing is shared with other sites on this account.
