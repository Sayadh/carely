import type { QualificationKind } from '../enums.js';

/** Platform-authored label in every supported locale (Armenian is the editorial source). */
export interface LocalizedText {
  hy: string;
  ru: string;
  en: string;
}

export interface ServiceDefinition {
  /** Globally unique, stable identifier. Never rename once in use — it is the sync key for the database. */
  slug: string;
  name: LocalizedText;
  /** Credential that must be VERIFIED before the service can be approved or requested. Inherits the category's when omitted. */
  requiredQualification?: QualificationKind;
}

export interface CategoryDefinition {
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  /** Applies to every service of the category (e.g. nursing). */
  requiredQualification?: QualificationKind;
  /** Credentials that are meaningful search filters / trust signals for this category. */
  relevantQualifications: readonly QualificationKind[];
  services: readonly ServiceDefinition[];
}

/** Global facet option (not a service): shared by all categories unless restricted. */
export interface FacetOption {
  slug: string;
  name: LocalizedText;
  /** Category slugs where the option may be selected. Omitted = all categories. */
  categories?: readonly string[];
}
