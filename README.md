# Carely.am

Care-services marketplace for Armenia: childcare, elderly care, patient care (non-medical), nursing services (verified licence only), pet care, disability care, personal assistance, home help. Yerevan and all ten marzes. Armenian (default), Russian, English.

**Status:** MVP. Production target: HayHost cPanel (Passenger, MariaDB 10.6, Node 22) — release with `npm run release:cpanel`, steps in `docs/DEPLOY-CPANEL.md`. See "Remaining work" below.

## Stack

| Part | Choice |
|---|---|
| Monorepo | npm workspaces: `apps/web`, `apps/api`, `packages/shared` |
| Web | Nuxt 4 (Vue 3, `<script setup lang="ts">`), SSR, Tailwind CSS 4, Pinia, `@nuxtjs/i18n` (hy/ru/en), lucide icons, self-hosted Noto Sans + Noto Sans Armenian |
| API | NestJS 11, Prisma 6.19 (provider `mysql`), zod validation shared with the web app, OpenAPI at `/api/docs` |
| DB | MySQL 8 / MariaDB 10.6+ (developed and tested on **MariaDB 10.11**), InnoDB, utf8mb4 |
| Auth | Email + password (Node `scrypt`, no native addon), opaque session tokens (SHA-256 hashed) in HttpOnly cookies |
| Media | Local filesystem adapter (dev) or S3-compatible (prod); portraits resized with `sharp`; private documents stored separately |
| Mail | `database` (dev inbox), `console` (dev), `smtp` (prod, nodemailer) |

The web app proxies `/api/**` to NestJS on the same origin (no CORS; first-party cookies).

## Local setup

Requirements: Node.js ≥ 20.19 (tested on 22), npm 10, a MySQL/MariaDB server.

```bash
npm install                                  # also builds packages/shared

# Database — either an existing local MariaDB/MySQL:
#   CREATE DATABASE carely CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
#   CREATE USER 'carely'@'localhost' IDENTIFIED BY 'carely_dev'; GRANT ALL ON carely.* TO 'carely'@'localhost';
# or the optional container:  docker compose up -d db

cp apps/api/.env.example apps/api/.env       # set DATABASE_URL, JOBS_TOKEN
cp apps/web/.env.example apps/web/.env

npm run db:migrate:deploy                    # apply committed migrations
npm run db:seed:demo                         # reference data + fictitious demo data (DEMO_MODE=true only)
#   npm run db:seed                          # reference data only (categories, services, locations)

npm run dev:api                              # http://localhost:4000/api  (docs: /api/docs)
npm run dev:web                              # http://localhost:3000  → redirects to /hy
```

`prisma migrate dev` (creating new migrations) needs a shadow database — set `SHADOW_DATABASE_URL` if your DB user cannot create databases.

### Development accounts (demo seed only — never in production)

All passwords: `CarelyDemo2026!`

| Email | Role |
|---|---|
| `admin@carely.local` | administrator |
| `customer@carely.local` | customer (Armenian) — has requests in several states |
| `customer2@carely.local` | customer (Russian) |
| `ani@carely.local`, `lilit@`, `nare@`, `marine@`, `gayane@`, `armen@`, `susanna@`, `hasmik@` (nursing), `tatevik@`, `karen@`, `mane@`, `davit@`, `sona@`, `elen@`, `anush@` (disability care), `gor@` (personal assistance), `zara@` (home help) (all `@carely.local`) | approved demo professionals |
| `ruzanna@carely.local` | pending application (admin queue) |

Password-reset emails in development land in the database inbox: `GET http://localhost:4000/api/dev/mail` (disabled in production).

## Commands

```bash
npm run build          # shared → api → web production builds
npm run typecheck      # tsc (api) + vue-tsc (web)
npm test               # API tests (real MariaDB test DB) + i18n parity check
npm run jobs:run       # expire requests, clean sessions/tokens (cron entry point)
```

API tests use `TEST_DATABASE_URL` (default `mysql://carely:carely_dev@localhost:3306/carely_test`). Use a database dedicated to tests; setup runs `prisma migrate deploy` and the reference seed (non-destructive).

## Key behaviour

- **Taxonomy (categories, services, filters) lives in code:** `packages/shared/src/taxonomy/categories/*.ts` (one file per category) and `filters.ts` (work schedule, work place, pay types). `npm run db:seed` syncs it into the database (idempotent; removed slugs are deactivated, never deleted). Never rename a slug that is in use. Run `npm run db:seed` after every deploy.

- **Requests go to the Carely team (leads):** clients send a request from a profile or the general form at `/request` (name + phone, no account needed; honeypot + rate limit). It is stored as `CareLead` and shown in admin → Հայտեր, with an optional Telegram alert (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — several ids comma-separated). The professional is never notified; the team calls the client, assigns a professional and moves the lead `NEW → IN_PROGRESS → MATCHED → CLOSED/CANCELLED` (every change audit-logged). "Call us" buttons use `NUXT_PUBLIC_SUPPORT_PHONE`.
- **Legacy direct booking** (below) is off unless `DIRECT_REQUESTS_ENABLED=true`; existing bookings stay readable under admin → Ամրագրումներ (արխիվ).
- **Request lifecycle (legacy):** `SUBMITTED → ACCEPTED/DECLINED → CONFIRMED → COMPLETED`, `CANCELLED` from any active state, `EXPIRED` when an accepted request isn't confirmed within `ACCEPTED_REQUEST_TTL_HOURS` (default 48) or a request's start passes unanswered. Every transition is recorded in `RequestEvent`.
- **No double booking:** only confirmation creates `BookingOccurrence` rows. Confirmation locks the professional row (`SELECT … FOR UPDATE`), locks the request, does a locking overlap read and inserts in one READ COMMITTED transaction, with deadlock retry. Cancel/complete follow the same lock order. Covered by concurrent tests.
- **Recurring requests** expand to a finite window (max 8 weeks).
- **Times** stored as UTC, displayed in Asia/Yerevan; half-open intervals.
- **Verification** is per credential. Editing a credential or its documents removes the badge until re-review. Nursing services require a verified nursing licence before approval and before customers can request them.
- **Reviews:** only the customer of a `COMPLETED` request, one per request. Every review starts `PENDING` and is visible publicly only after an admin publishes it. A follow-up phone (`Review.contactPhone`, prefilled from the account) is required and shown to admins only. A reason (≥10 chars) is required for ratings below 5; text is optional for 5 stars. Admin list has a "low ratings (1–4)" filter.
- **Rating:** linearly weighted mean of the professional's last 50 published reviews (by `createdAt`, then `id`; oldest weight 1 → newest weight 2, `weight(i) = 1 + i/(n-1)` with the real `n`). Computed only in `apps/api/src/reviews/rating.ts` and stored on `ProfessionalProfile` (`ratingValue` unrounded, `ratingCount` ≤ 50, `totalReviewCount`) inside the same transaction as every review change, under a profile row lock. APIs return `rating` rounded to 2 decimals or `null`; 1–4 counted ratings are shown as preliminary. `npm run jobs:run` rebuilds any out-of-date stored totals (also the backfill after the migration).
- **Privacy:** public DTOs carry no email/phone/address/document data; contacts appear only after confirmation, to the two participants. Admin document views and request views are audit-logged.
- **i18n:** all UI text in `apps/web/i18n/locales/{hy,ru,en}.json`; API returns error codes, notifications store type + params. `npm run test:i18n -w @carely/web` checks key parity and references.

## Docs

- `docs/ARCHITECTURE.md` — decisions, data model, security notes
- `docs/DEPLOY-CPANEL.md` — cPanel/Passenger deployment (release, upload, env, migrations, cron, backup/restore, moving hosts)
- `docs/DEPLOY-VPS.md` — alternative VPS deployment

## Remaining work (explicit)

- Production SMTP credentials and S3-compatible bucket; real hero photography (licensed) and OG image.
- Legal texts are drafts pending operator/legal review; no company identity is published.
- SMS phone verification (architecture ready, not implemented); criminal-record checks are not part of v1.
- Payments/monetisation intentionally not built.
- Rate limiting is in-process (single Node process); use a shared store if the API is ever scaled horizontally.
