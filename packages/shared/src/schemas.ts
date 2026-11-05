import { z } from 'zod';
import { AGE_LIMITS } from './taxonomy/filters.js';
import { addDays, utcToZonedDate } from './time.js';
import {
  LOCALES,
  PRICE_UNITS,
  PRICE_KINDS,
  SCHEDULE_TYPES,
  QUALIFICATION_KINDS,
  SPOKEN_LANGUAGES,
  SUPPORT_TOPICS,
  SEARCH_SORTS,
  REQUEST_STATUSES,
  VERIFICATION_STATUSES,
  REVIEW_STATUSES,
  PROFILE_STATUSES,
  LOCATION_TYPES,
  EDUCATION_LEVELS,
  SUPPORT_STATUSES,
  LEAD_STATUSES,
  LIMITS,
} from './enums.js';

/**
 * Validation messages are stable keys (snake_case) translated by the web app under `validation.*`.
 */
const id = z.string().min(1, 'required').max(40, 'invalid');
const trimmed = (max: number, min = 0) =>
  z
    .string()
    .trim()
    .min(min, min > 0 ? 'required' : 'invalid')
    .max(max, 'too_long');

export const localeSchema = z.enum(LOCALES);

/** Armenian phone numbers: +374XXXXXXXX or 0XXXXXXXX (spaces, dashes, brackets ignored). Normalized to +374XXXXXXXX. */
export const armenianPhoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s\-()]/g, ''))
  .refine((v) => /^(\+374|00374|374|0)\d{8}$/.test(v), 'phone_invalid')
  .transform((v) => '+374' + v.slice(-8));

export function normalizeArmenianPhone(v: string): string | null {
  const r = armenianPhoneSchema.safeParse(v);
  return r.success ? r.data : null;
}

const emailSchema = z.string().trim().toLowerCase().max(191, 'too_long').pipe(z.email('email_invalid'));
const passwordSchema = z.string().min(10, 'password_min').max(128, 'too_long');

// ---------- Auth ----------
export const registerSchema = z.object({
  name: trimmed(80, 2),
  email: emailSchema,
  password: passwordSchema,
  phone: armenianPhoneSchema.optional().or(z.literal('').transform(() => undefined)),
  locale: localeSchema.default('hy'),
  acceptTerms: z.literal(true, 'terms_required'),
});
export type RegisterInput = z.input<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'required').max(128, 'too_long'),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({ token: z.string().min(20, 'invalid').max(200, 'invalid'), password: passwordSchema });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1, 'required'), newPassword: passwordSchema });

export const updateAccountSchema = z.object({
  name: trimmed(80, 2).optional(),
  phone: armenianPhoneSchema.nullable().optional().or(z.literal('').transform(() => null)),
  locale: localeSchema.optional(),
});

// ---------- Search ----------
const csv = <T extends z.ZodType<string, string>>(item: T) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v === undefined ? [] : (Array.isArray(v) ? v : v.split(',')).map((s) => s.trim()).filter(Boolean)))
    .pipe(z.array(item).max(20, 'too_many'));

const optInt = (min: number, max: number) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === undefined || v === '' ? undefined : Number(v)))
    .pipe(z.number().int('invalid').min(min, 'invalid').max(max, 'invalid').optional());

const optNum = (min: number, max: number) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === undefined || v === '' ? undefined : Number(v)))
    .pipe(z.number().min(min, 'invalid').max(max, 'invalid').optional());

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'invalid');
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid');

export const searchQuerySchema = z
  .object({
    category: z.string().max(60).optional(),
    service: z.string().max(60).optional(),
    location: z.string().max(80).optional(),
    priceUnit: z.enum(PRICE_UNITS).optional(),
    /** NEGOTIABLE = "Պայմանագրային": offerings whose price is agreed with the professional. */
    priceKind: z.enum(PRICE_KINDS).optional(),
    priceMin: optInt(0, 10_000_000),
    priceMax: optInt(0, 10_000_000),
    experienceMin: optInt(0, 60),
    ageMin: optInt(AGE_LIMITS.min, AGE_LIMITS.max),
    ageMax: optInt(AGE_LIMITS.min, AGE_LIMITS.max),
    educationMin: z.enum(EDUCATION_LEVELS).optional(),
    ratingMin: optNum(1, 5),
    languages: csv(z.enum(SPOKEN_LANGUAGES)),
    /** Global facet slugs (work schedule, work place). OR inside a group, AND across groups. */
    attributes: csv(z.string().max(60)),
    verified: csv(z.enum(QUALIFICATION_KINDS)),
    date: ymd.optional(),
    /** Free window on `date` (local time, Asia/Yerevan). Both or neither. */
    timeFrom: hhmm.optional(),
    timeTo: hhmm.optional(),
    /** Professional can start working on or before this date. */
    startBy: ymd.optional(),
    sort: z.enum(SEARCH_SORTS).default('relevance'),
    page: optInt(1, 1000).transform((v) => v ?? 1),
    pageSize: optInt(1, LIMITS.pageSizeMax).transform((v) => v ?? 12),
  })
  .superRefine((q, ctx) => {
    if (q.ageMin != null && q.ageMax != null && q.ageMin > q.ageMax) ctx.addIssue({ code: 'custom', message: 'invalid', path: ['ageMax'] });
    if (!!q.timeFrom !== !!q.timeTo) ctx.addIssue({ code: 'custom', message: 'required', path: [q.timeFrom ? 'timeTo' : 'timeFrom'] });
    if (q.timeFrom && q.timeTo && q.timeTo <= q.timeFrom) ctx.addIssue({ code: 'custom', message: 'end_before_start', path: ['timeTo'] });
    if (q.timeFrom && !q.date) ctx.addIssue({ code: 'custom', message: 'required', path: ['date'] });
  });
export type SearchQuery = z.output<typeof searchQuerySchema>;

// ---------- Onboarding ----------
export const onboardingIntroSchema = z.object({
  displayName: trimmed(80, 2),
  headline: trimmed(LIMITS.headlineMax, 3),
  bio: trimmed(LIMITS.bioMax, 40),
  originalLocale: localeSchema,
  phone: armenianPhoneSchema,
  portraitMediaId: id.nullable().optional(),
});

export const onboardingServicesSchema = z.object({
  categoryId: id,
  serviceIds: z.array(id).min(1, 'select_at_least_one').max(20, 'too_many'),
  attributeIds: z.array(id).max(40, 'too_many').default([]),
});

export const onboardingExperienceSchema = z
  .object({
    experienceYears: z.number().int('invalid').min(0, 'invalid').max(60, 'invalid'),
    experienceSummary: trimmed(1000).optional().default(''),
    birthYear: z.number('required').int('invalid'),
    educationLevel: z.enum(EDUCATION_LEVELS, 'required'),
    /** Earliest start date; null = available now. */
    availableFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid')
      .nullable()
      .optional()
      .or(z.literal('').transform(() => null)),
  })
  .superRefine((v, ctx) => {
    const age = new Date().getUTCFullYear() - v.birthYear;
    if (age < AGE_LIMITS.min || age > AGE_LIMITS.max) ctx.addIssue({ code: 'custom', message: 'age_invalid', path: ['birthYear'] });
  });

export const qualificationInputSchema = z.object({
  kind: z.enum(QUALIFICATION_KINDS),
  title: trimmed(160, 2),
  issuer: trimmed(160).optional().default(''),
  issuedYear: z.number().int().min(1950, 'invalid').max(2100, 'invalid').nullable().optional(),
});

export const onboardingAreaSchema = z.object({
  homeLocationId: id,
  serviceAreaIds: z.array(id).min(1, 'select_at_least_one').max(30, 'too_many'),
});

export const onboardingLanguagesSchema = z.object({
  languages: z.array(z.enum(SPOKEN_LANGUAGES)).min(1, 'select_at_least_one').max(SPOKEN_LANGUAGES.length),
});

export const offeringInputSchema = z
  .object({
    serviceId: id,
    priceKind: z.enum(PRICE_KINDS),
    priceAmount: z.number().int('invalid').min(100, 'price_min').max(10_000_000, 'invalid').nullable().optional(),
    priceUnit: z.enum(PRICE_UNITS),
  })
  .refine((o) => o.priceKind !== 'FIXED' || (o.priceAmount ?? 0) > 0, { message: 'price_required', path: ['priceAmount'] });

export const onboardingPricesSchema = z.object({ offerings: z.array(offeringInputSchema).min(1, 'select_at_least_one').max(20) });

export const availabilityRuleSchema = z
  .object({
    weekday: z.number().int().min(1).max(7),
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(1).max(1440),
  })
  .refine((r) => r.endMinute > r.startMinute, { message: 'end_before_start', path: ['endMinute'] });

export const onboardingScheduleSchema = z.object({ rules: z.array(availabilityRuleSchema).max(50) });

export const availabilityExceptionSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid'),
    available: z.boolean().default(false),
    startMinute: z.number().int().min(0).max(1439).nullable().optional(),
    endMinute: z.number().int().min(1).max(1440).nullable().optional(),
    note: trimmed(200).optional().default(''),
  })
  .refine((e) => e.startMinute == null || e.endMinute == null || e.endMinute > e.startMinute, {
    message: 'end_before_start',
    path: ['endMinute'],
  });

// ---------- Requests ----------

export const createRequestSchema = z
  .object({
    professionalSlug: z.string().min(1).max(120),
    serviceId: id,
    scheduleType: z.enum(SCHEDULE_TYPES),
    date: ymd.optional(),
    startDate: ymd.optional(),
    endDate: ymd.optional(),
    weekdays: z.array(z.number().int().min(1).max(7)).max(7).optional(),
    startTime: hhmm,
    endTime: hhmm,
    locationId: id,
    addressNote: trimmed(300).optional().default(''),
    requirements: trimmed(LIMITS.requirementsMax).optional().default(''),
  })
  .superRefine((v, ctx) => {
    if (v.scheduleType === 'ONE_TIME' && !v.date) ctx.addIssue({ code: 'custom', message: 'required', path: ['date'] });
    if (v.scheduleType === 'RECURRING') {
      if (!v.startDate) ctx.addIssue({ code: 'custom', message: 'required', path: ['startDate'] });
      if (!v.endDate) ctx.addIssue({ code: 'custom', message: 'required', path: ['endDate'] });
      if (!v.weekdays?.length) ctx.addIssue({ code: 'custom', message: 'select_at_least_one', path: ['weekdays'] });
    }
    if (v.startTime === v.endTime) ctx.addIssue({ code: 'custom', message: 'end_before_start', path: ['endTime'] });
  });
export type CreateRequestInput = z.input<typeof createRequestSchema>;

export const transitionSchema = z.object({ reason: trimmed(500).optional().default('') });
export const cancelSchema = z.object({ reason: trimmed(500, 3) });
export const requestNoteSchema = z.object({ body: trimmed(LIMITS.noteMax, 1) });

export const requestListQuerySchema = z.object({
  status: z.enum(REQUEST_STATUSES).optional(),
  as: z.enum(['customer', 'professional']).default('customer'),
  page: optInt(1, 1000).transform((v) => v ?? 1),
});

// ---------- Reviews ----------
/** Minimum reason length when the rating is below 5. */
export const REVIEW_REASON_MIN = 10;
export const createReviewSchema = z
  .object({
    requestId: id,
    rating: z.number().int().min(1, 'invalid').max(5, 'invalid'),
    // Optional for 5 stars; a reason is required below 5 (checked below).
    body: trimmed(LIMITS.reviewMax).optional().default(''),
    // Admin-only follow-up contact.
    contactPhone: armenianPhoneSchema,
    locale: localeSchema,
  })
  .superRefine((v, ctx) => {
    if (v.rating < 5 && v.body.length < REVIEW_REASON_MIN) ctx.addIssue({ code: 'custom', path: ['body'], message: 'reason_required' });
  });

// ---------- Support ----------
export const supportInquirySchema = z.object({
  name: trimmed(80, 2),
  email: emailSchema,
  topic: z.enum(SUPPORT_TOPICS),
  message: trimmed(3000, 10),
  requestId: id.optional().or(z.literal('').transform(() => undefined)),
  locale: localeSchema.default('hy'),
});

// ---------- Care requests handled by the Carely team ("leads") ----------
const optionalId = id.optional().or(z.literal('').transform(() => undefined));

/**
 * Public request form (no account needed). From a profile it carries `professionalSlug`; the general form may name a
 * category instead. Everything except name and phone is optional — the team calls the client to clarify.
 */
export const createLeadSchema = z.object({
  name: trimmed(80, 2),
  phone: armenianPhoneSchema,
  professionalSlug: z.string().trim().max(80, 'too_long').optional().or(z.literal('').transform(() => undefined)),
  categorySlug: z.string().trim().max(60, 'too_long').optional().or(z.literal('').transform(() => undefined)),
  serviceId: optionalId,
  locationId: optionalId,
  /** Optional period (Armenia-local YYYY-MM-DD). Either end may be left open. */
  startDate: ymd.optional().or(z.literal('').transform(() => undefined)),
  endDate: ymd.optional().or(z.literal('').transform(() => undefined)),
  /** Days and hours in the client's words, e.g. "weekdays, 10:00–14:00". */
  schedule: trimmed(LIMITS.leadScheduleMax).optional().default(''),
  message: trimmed(LIMITS.leadMessageMax).optional().default(''),
  locale: localeSchema.default('hy'),
  /** Honeypot: real users never fill it. */
  website: z.string().max(200).optional().default(''),
}).superRefine((v, ctx) => {
  const today = utcToZonedDate(new Date());
  const latest = addDays(today, LIMITS.leadDateMaxDays);
  for (const k of ['startDate', 'endDate'] as const) {
    const d = v[k];
    if (d && d < today) ctx.addIssue({ code: 'custom', path: [k], message: 'date_in_past' });
    else if (d && d > latest) ctx.addIssue({ code: 'custom', path: [k], message: 'invalid' });
  }
  if (v.startDate && v.endDate && v.endDate < v.startDate) ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'end_before_start' });
});
export type CreateLeadInput = z.input<typeof createLeadSchema>;

export const adminLeadListQuerySchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});

/** Every field optional: the admin changes status, (re)assigns the professional or edits the internal note. */
export const adminLeadUpdateSchema = z
  .object({
    status: z.enum(LEAD_STATUSES).optional(),
    professionalId: id.nullable().optional(),
    adminNote: trimmed(LIMITS.leadMessageMax).optional(),
  })
  .refine((v) => v.status !== undefined || v.professionalId !== undefined || v.adminNote !== undefined, 'required');

// ---------- Admin ----------
export const adminRejectSchema = z.object({ reason: trimmed(1000, 5) });
export const adminNoteSchema = z.object({ note: trimmed(2000).optional().default('') });
export const adminQualificationReviewSchema = z.object({
  status: z.enum(VERIFICATION_STATUSES),
  internalNote: trimmed(2000).optional().default(''),
  rejectionReason: trimmed(1000).optional().default(''),
});
export const adminReviewModerationSchema = z.object({ status: z.enum(REVIEW_STATUSES), note: trimmed(1000).optional().default('') });
export const adminProfileStatusQuery = z.object({
  status: z.enum(PROFILE_STATUSES).optional(),
  page: optInt(1, 1000).transform((v) => v ?? 1),
});
export const adminSupportUpdateSchema = z.object({ status: z.enum(SUPPORT_STATUSES), adminNote: trimmed(2000).optional().default('') });
export const adminSuspendSchema = z.object({ suspended: z.boolean(), reason: trimmed(1000).optional().default('') });

const translationsSchema = z.object({
  hy: z.object({ name: trimmed(120, 1), description: trimmed(1000).optional().default('') }),
  ru: z.object({ name: trimmed(120).default(''), description: trimmed(1000).optional().default('') }),
  en: z.object({ name: trimmed(120).default(''), description: trimmed(1000).optional().default('') }),
});

export const slugSchema = z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'slug_invalid').max(60, 'too_long');

/** Categories, services and facets are code-managed (`taxonomy/`); only locations are edited by admins. */
export const adminLocationSchema = z.object({
  slug: slugSchema,
  type: z.enum(LOCATION_TYPES),
  parentId: id.nullable().optional(),
  sortOrder: z.number().int().min(0).max(999).default(0),
  active: z.boolean().default(true),
  translations: translationsSchema,
});
