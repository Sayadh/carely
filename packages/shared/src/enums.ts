export const LOCALES = ['hy', 'ru', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'hy';

export const APP_TIMEZONE = 'Asia/Yerevan';

export const USER_STATUSES = ['ACTIVE', 'SUSPENDED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const PROFILE_STATUSES = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

export const PRICE_UNITS = ['HOUR', 'DAY', 'WEEK', 'MONTH', 'VISIT'] as const;
export type PriceUnit = (typeof PRICE_UNITS)[number];

/** FIXED requires an amount. NEGOTIABLE means "agreed with the specialist" — never shown as free. */
export const PRICE_KINDS = ['FIXED', 'NEGOTIABLE'] as const;
export type PriceKind = (typeof PRICE_KINDS)[number];

export const REQUEST_STATUSES = [
  'SUBMITTED',
  'ACCEPTED',
  'DECLINED',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export const TERMINAL_REQUEST_STATUSES: RequestStatus[] = ['DECLINED', 'COMPLETED', 'CANCELLED', 'EXPIRED'];

export const SCHEDULE_TYPES = ['ONE_TIME', 'RECURRING'] as const;
export type ScheduleType = (typeof SCHEDULE_TYPES)[number];

export const QUALIFICATION_KINDS = [
  'IDENTITY',
  'NURSING_LICENSE',
  'MEDICAL_EDUCATION',
  'FIRST_AID',
  'PEDAGOGY',
  'VETERINARY',
  'OTHER',
] as const;
export type QualificationKind = (typeof QUALIFICATION_KINDS)[number];

export const VERIFICATION_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const REVIEW_STATUSES = ['PENDING', 'PUBLISHED', 'REJECTED'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** Global profile facets; options live in `taxonomy/filters.ts`. */
export const ATTRIBUTE_GROUPS = ['WORK_SCHEDULE', 'WORK_PLACE'] as const;
export type AttributeGroup = (typeof ATTRIBUTE_GROUPS)[number];

/** Ordered lowest → highest; the search filter means "at least this level". */
export const EDUCATION_LEVELS = ['SECONDARY', 'VOCATIONAL', 'BACHELOR', 'MASTER'] as const;
export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

export const LOCATION_TYPES = ['REGION', 'CITY', 'DISTRICT'] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export const SPOKEN_LANGUAGES = ['hy', 'ru', 'en', 'fr', 'de', 'es', 'it', 'fa', 'ar', 'el', 'ka'] as const;
export type SpokenLanguage = (typeof SPOKEN_LANGUAGES)[number];

export const SUPPORT_TOPICS = ['GENERAL', 'ACCOUNT', 'REQUEST_ISSUE', 'PROFESSIONAL', 'SAFETY', 'OTHER'] as const;
export type SupportTopic = (typeof SUPPORT_TOPICS)[number];

export const SUPPORT_STATUSES = ['OPEN', 'CLOSED'] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

/** Admin-brokered care requests ("leads"): the Carely team finds a professional and introduces both sides. */
export const LEAD_STATUSES = ['NEW', 'IN_PROGRESS', 'MATCHED', 'CLOSED', 'CANCELLED'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const OPEN_LEAD_STATUSES: LeadStatus[] = ['NEW', 'IN_PROGRESS'];
export const LEAD_SOURCES = ['PROFILE', 'GENERAL'] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const NOTIFICATION_TYPES = [
  'REQUEST_SUBMITTED',
  'REQUEST_ACCEPTED',
  'REQUEST_DECLINED',
  'REQUEST_CONFIRMED',
  'REQUEST_COMPLETED',
  'REQUEST_CANCELLED',
  'REQUEST_EXPIRED',
  'REQUEST_NOTE',
  'PROFILE_SUBMITTED',
  'PROFILE_APPROVED',
  'PROFILE_REJECTED',
  'PROFILE_SUSPENDED',
  'QUALIFICATION_VERIFIED',
  'QUALIFICATION_REJECTED',
  'REVIEW_PUBLISHED',
  'REVIEW_REJECTED',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const SEARCH_SORTS = ['relevance', 'price_asc', 'price_desc', 'experience'] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

export const ONBOARDING_STEPS = ['intro', 'services', 'experience', 'area', 'languages', 'prices', 'schedule', 'documents', 'preview'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Request transition rules. Actor role is relative to the request. */
export type RequestActor = 'CUSTOMER' | 'PROFESSIONAL' | 'SYSTEM' | 'ADMIN';
export const REQUEST_TRANSITIONS: Record<string, { from: RequestStatus[]; to: RequestStatus; actors: RequestActor[] }> = {
  accept: { from: ['SUBMITTED'], to: 'ACCEPTED', actors: ['PROFESSIONAL'] },
  decline: { from: ['SUBMITTED'], to: 'DECLINED', actors: ['PROFESSIONAL'] },
  confirm: { from: ['ACCEPTED'], to: 'CONFIRMED', actors: ['CUSTOMER'] },
  complete: { from: ['CONFIRMED'], to: 'COMPLETED', actors: ['PROFESSIONAL'] },
  cancel: { from: ['SUBMITTED', 'ACCEPTED', 'CONFIRMED'], to: 'CANCELLED', actors: ['CUSTOMER', 'PROFESSIONAL', 'ADMIN'] },
  expire: { from: ['SUBMITTED', 'ACCEPTED'], to: 'EXPIRED', actors: ['SYSTEM'] },
};
export type RequestAction = 'accept' | 'decline' | 'confirm' | 'complete' | 'cancel';

export function canTransition(action: keyof typeof REQUEST_TRANSITIONS, from: RequestStatus, actor: RequestActor): boolean {
  const rule = REQUEST_TRANSITIONS[action];
  return !!rule && rule.from.includes(from) && rule.actors.includes(actor);
}

export const LIMITS = {
  recurringMaxWeeks: 8,
  requestMaxDurationMinutes: 24 * 60,
  bioMax: 3000,
  headlineMax: 120,
  requirementsMax: 1000,
  reviewMax: 2000,
  noteMax: 1000,
  leadScheduleMax: 300,
  leadMessageMax: 2000,
  leadDateMaxDays: 366,
  portraitMaxBytes: 5 * 1024 * 1024,
  documentMaxBytes: 8 * 1024 * 1024,
  pageSizeMax: 30,
} as const;
