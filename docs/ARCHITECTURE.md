# Architecture and decisions

## Assumptions recorded during implementation
- Repository was empty; the stack from the brief was initialised. Nuxt **4** is used (Nuxt 3 is end-of-life); NestJS **11** and Prisma **6.19** were chosen as stable, well-supported releases for MySQL/MariaDB and Node 20/22.
- Development and tests ran on **MariaDB 10.11** (a common cPanel engine). The schema avoids engine-specific features and should also run on MySQL 8; verify on the real host.
- One primary category per professional profile (their "specialty"); multiple services within it.
- **Taxonomy is code-managed.** Categories, services and global facets are TypeScript constants in `packages/shared/src/taxonomy/` (one file per category). The database mirrors them (`syncTaxonomy` in `apps/api/src/taxonomy/sync.ts`, run by `npm run db:seed`), so foreign keys, translations-by-join and DTO ids stay unchanged. Slugs are the sync keys and must never be renamed; removing a slug deactivates the row (history is kept). Admins see the taxonomy read-only.
- 8 categories: childcare, elderly-care, patient-care (non-medical), nursing (every service requires a VERIFIED `NURSING_LICENSE`, set at category level), pet-care, disability-care, personal-assistance, home-help.
- Global facets (not services): work schedule and work place, stored in `CareAttribute` + join table. OR inside a group, AND across groups. An option may be restricted to categories (`place-online` → nursing, patient care, pet care, personal assistance), enforced on onboarding.
- Other profile filters: age (from `birthYear`; the public DTO exposes only the approximate age), minimum education (`EducationLevel`, ordered), displayed rating (≥ value, 2-decimal display tolerance), start date (`availableFrom`, null = now), free time window on a date.
- Price kinds: `FIXED` (integer AMD + unit `HOUR|DAY|WEEK|MONTH|VISIT`) or `NEGOTIABLE` ("Պայմանագրային", filter `priceKind=NEGOTIABLE`). `SHIFT` was retired (migrated to `DAY`). There is no "free" and no unknown price.
- Professionals choose service areas from the location tree; a region covers all its children. Search for a location matches profiles serving it, any ancestor or any descendant.
- "Relevance" sort = published review count, then experience, then id. There is no sponsored ranking.
- Date filter = weekly rules + dated exceptions − confirmed bookings, requiring ≥ 60 free minutes that day, or — with `timeFrom`/`timeTo` — the whole window free.
- Search computes a bounded candidate list (max 1,000 profiles) to support date filtering and like-for-like price sorting; this is adequate for MVP scale and flagged in the response (`capped`).

## Layout
```
packages/shared   enums, zod schemas (validation used by both API and web), DTO types, time helpers,
                  taxonomy/ (categories/*.ts, filters.ts — source of truth for categories, services, facets)
apps/api          NestJS modules: auth, taxonomy, professionals (public), onboarding (self), media,
                  requests, reviews, notifications+audit, support, admin, jobs, mail
apps/api/prisma   schema.prisma, migrations/, seed.ts (reference + --demo), seed-data.ts
apps/web          Nuxt app: app/{pages,layouts,components/ui,components/app,composables,stores}, i18n/, server/
```

## Security
- Session: 32-byte random token in an HttpOnly, SameSite=Lax cookie (Secure in production); only its SHA-256 is stored. Logout deletes the row; password change/reset revokes sessions.
- CSRF: every non-GET request needs header `x-carely-csrf: 1` and, if the browser sends `Origin`, an origin from `APP_ORIGIN`. No CORS is enabled, so cross-site pages cannot send the header.
- Authorization: global `SessionGuard`; `@Auth()` / `@Auth('admin')` per route. Ownership is always derived from the session (`customerId`, `professional.userId`); IDs from clients are never trusted. Non-participants get 404 for requests.
- Mass assignment: every body is parsed by a zod schema that only contains allowed fields; `isAdmin`, statuses and verification fields are never accepted from users.
- Uploads: magic-byte sniffing (JPEG/PNG/WEBP/PDF), size limits, random names, portraits re-encoded (strips EXIF). Private documents live in a separate store and are streamed only to admins with an audit entry and `Cache-Control: no-store`.
- Rate limits on register/login (per IP and per email)/forgot/reset/uploads/requests/support.
- Logs are structured JSON with a request id; sensitive keys are redacted; request bodies and care details are never logged.
- Production boot refuses to start with insecure cookies, dev mail drivers, demo mode or a short jobs token.

## Concurrency protocol (booking confirmation)
1. `SELECT id FROM ProfessionalProfile WHERE id=? FOR UPDATE`
2. `SELECT id FROM CareRequest WHERE id=? FOR UPDATE` and re-read status/expiry
3. `SELECT … FROM BookingOccurrence WHERE professionalId=? AND status='ACTIVE' AND startAt < :end AND endAt > :start FOR UPDATE`
4. Check overlaps (half-open) and unavailable exceptions → insert occurrences → conditional status update → event + notification.

READ COMMITTED isolation, Prisma interactive transaction, retry on InnoDB 1213/1205/P2034. `complete` and `cancel` use the same lock order. Tests: two overlapping confirmations in parallel (exactly one succeeds), six parallel confirmations (exactly one), double-submit of the same request.

## Scheduled work
`POST /api/internal/jobs/run` with header `x-jobs-token` or `node apps/api/dist/jobs-cli.js` from cron. Each run: expire due requests (≤500), delete expired sessions, old reset tokens and old dev mail. Reads/transitions also expire lazily, so correctness does not depend on cron timing.

## Localisation
- Routes `/hy`, `/ru`, `/en` (`strategy: prefix`); `/` redirects to the saved `carely_locale` cookie or Armenian. Browser language is deliberately ignored.
- Month/weekday names and number grouping come from dictionaries (Armenian ICU data is missing in some browsers and would otherwise cause SSR/client differences).
- Unfinished forms (request, contact) are kept in `sessionStorage` drafts, so switching language or signing in does not lose them.
- User-authored text keeps its original language; authors may add their own translations. The UI shows a notice when the original is displayed.
