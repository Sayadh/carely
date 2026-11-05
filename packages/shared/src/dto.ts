import type {
  Locale,
  PriceKind,
  PriceUnit,
  ProfileStatus,
  QualificationKind,
  RequestStatus,
  ScheduleType,
  VerificationStatus,
  ReviewStatus,
  AttributeGroup,
  EducationLevel,
  LocationType,
  NotificationType,
  SpokenLanguage,
  SupportTopic,
  SupportStatus,
  LeadStatus,
  LeadSource,
} from './enums.js';

/** Localized label map supplied by the API for platform-managed taxonomy. */
export type I18nText = Partial<Record<Locale, string>>;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface SessionUserDto {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  phoneVerified: false;
  locale: Locale;
  isAdmin: boolean;
  professional: { id: string; slug: string; status: ProfileStatus } | null;
  unreadNotifications: number;
}

export interface CategoryDto {
  id: string;
  slug: string;
  name: I18nText;
  description: I18nText;
  services: ServiceDto[];
}
export interface ServiceDto {
  id: string;
  slug: string;
  categoryId: string;
  name: I18nText;
  requiredQualification: QualificationKind | null;
}
/** Global facet option (work schedule / work place). */
export interface AttributeDto {
  id: string;
  slug: string;
  group: AttributeGroup;
  name: I18nText;
  /** Category slugs where the option applies; null = every category. */
  categories: string[] | null;
}
export interface LocationDto {
  id: string;
  slug: string;
  type: LocationType;
  parentId: string | null;
  name: I18nText;
}

export interface PriceDto {
  kind: PriceKind;
  amount: number | null;
  unit: PriceUnit;
}

/** Public verification label: only what was actually checked. */
export interface VerificationLabelDto {
  kind: QualificationKind;
  title: string;
  verifiedAt: string;
}

export interface ProfessionalCardDto {
  id: string;
  slug: string;
  displayName: string;
  headline: string;
  headlineLocale: Locale;
  portraitUrl: string | null;
  categorySlug: string;
  category: I18nText;
  homeLocation: I18nText;
  serviceAreas: { slug: string; name: I18nText }[];
  experienceYears: number;
  languages: SpokenLanguage[];
  verifications: VerificationLabelDto[];
  price: PriceDto | null; // representative price for the active filter
  weeklyDays: number[]; // ISO weekdays with declared availability
  /** Weighted mean of the last 50 published reviews, rounded to 2 decimals; null when there are none. Computed only by the API. */
  rating: number | null;
  /** Reviews used in `rating` (0–50). */
  ratingCount: number;
  /** All published reviews. */
  totalReviewCount: number;
  isDemo: boolean;
}

export interface ProfessionalProfileDto extends ProfessionalCardDto {
  bio: string;
  bioLocale: Locale;
  bioIsOriginal: boolean;
  services: { service: ServiceDto; price: PriceDto }[];
  attributes: AttributeDto[];
  schedule: { weekday: number; startMinute: number; endMinute: number }[];
  exceptions: { date: string; available: boolean; startMinute: number | null; endMinute: number | null }[];
  reviews: ReviewDto[];
  memberSince: string;
  /** Approximate age derived from the birth year (the year itself is never exposed). */
  age: number | null;
  educationLevel: EducationLevel | null;
  /** Earliest start date (YYYY-MM-DD) when in the future; null = available now. */
  availableFrom: string | null;
}

export interface ReviewDto {
  id: string;
  rating: number;
  body: string;
  locale: Locale;
  authorName: string; // first name + initial only
  serviceName: I18nText;
  createdAt: string;
  isDemo: boolean;
}

export interface RequestEventDto {
  id: string;
  type: string;
  fromStatus: RequestStatus | null;
  toStatus: RequestStatus | null;
  actorRole: 'CUSTOMER' | 'PROFESSIONAL' | 'SYSTEM' | 'ADMIN';
  note: string | null;
  createdAt: string;
}

export interface RequestSummaryDto {
  id: string;
  status: RequestStatus;
  scheduleType: ScheduleType;
  service: I18nText;
  location: I18nText;
  startAt: string;
  endAt: string;
  recurrence: { weekdays: number[]; startDate: string; endDate: string; startMinute: number; endMinute: number } | null;
  occurrenceCount: number;
  price: PriceDto | null;
  counterpart: { name: string; portraitUrl: string | null; slug: string | null };
  role: 'CUSTOMER' | 'PROFESSIONAL';
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  hasReview: boolean;
}

export interface RequestDetailDto extends RequestSummaryDto {
  requirements: string;
  addressNote: string | null; // only participants
  events: RequestEventDto[];
  notes: { id: string; authorRole: 'CUSTOMER' | 'PROFESSIONAL'; body: string; createdAt: string }[];
  /** Revealed only once CONFIRMED (or COMPLETED). */
  contacts: { customer: { name: string; phone: string | null; email: string }; professional: { name: string; phone: string | null; email: string } } | null;
  occurrences: { startAt: string; endAt: string }[];
  allowedActions: string[];
  cancelReason: string | null;
  declineReason: string | null;
}

export interface NotificationDto {
  id: string;
  type: NotificationType;
  params: Record<string, string | number>;
  readAt: string | null;
  createdAt: string;
}

export interface SupportInquiryDto {
  id: string;
  name: string;
  email: string;
  topic: SupportTopic;
  message: string;
  status: SupportStatus;
  requestId: string | null;
  adminNote: string | null;
  createdAt: string;
}

/** Admin-only: contains the client's contact details. */
export interface LeadAdminDto {
  id: string;
  status: LeadStatus;
  source: LeadSource;
  name: string;
  phone: string;
  /** Linked account, if the client was signed in. */
  user: { id: string; email: string } | null;
  requestedProfessional: { id: string; slug: string; displayName: string } | null;
  professional: { id: string; slug: string; displayName: string; phone: string | null } | null;
  category: I18nText | null;
  service: I18nText | null;
  location: I18nText | null;
  /** YYYY-MM-DD or null. */
  startDate: string | null;
  endDate: string | null;
  schedule: string;
  message: string;
  locale: Locale;
  adminNote: string | null;
  handledBy: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QualificationDto {
  id: string;
  kind: QualificationKind;
  title: string;
  issuer: string;
  issuedYear: number | null;
  status: VerificationStatus;
  rejectionReason: string | null;
  verifiedAt: string | null;
  documents: { id: string; originalName: string; size: number; createdAt: string }[];
}

export interface ReviewAdminDto extends ReviewDto {
  status: ReviewStatus;
  /** Admin-only follow-up phone. */
  contactPhone: string | null;
  professional: { slug: string; displayName: string };
  customer: { id: string; name: string };
}
