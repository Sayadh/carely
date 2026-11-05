# Carely — project instructions

- Monorepo: `packages/shared` (zod schemas, enums, DTOs — rebuild with `npm run build:shared` after changes), `apps/api` (NestJS 11 + Prisma 6, MySQL/MariaDB), `apps/web` (Nuxt 4, Tailwind 4, Pinia, i18n).
- Database is **MySQL/MariaDB** (shared cPanel hosting target). No PostgreSQL features, scalar arrays, JSONB operators or ILIKE. Write real migrations with `prisma migrate dev` locally; production uses `migrate deploy` only.
- Never trust ownership IDs from the client; derive from the session. Public DTOs must not contain contact/private data.
- Booking occurrences are created only through the locking confirmation path in `apps/api/src/requests/` — keep the lock order (professional → request → occurrences).
- Categories/services/facets are code-managed in `packages/shared/src/taxonomy/` (DB is a mirror synced by `npm run db:seed`). Don't add admin CRUD or seed rows for them; never rename slugs in use.
- All UI text goes into `apps/web/i18n/locales/{hy,ru,en}.json` (Armenian first). Run `npm run test:i18n -w @carely/web`.
- API errors: throw `AppError(code)` with a code from `packages/shared/src/errors.ts`; add translations under `errors.*`.
- Checks: `npm run typecheck`, `npm test`, `npm run build`.
- No Docker/Railway in production; the docker-compose file is an optional local DB only.
