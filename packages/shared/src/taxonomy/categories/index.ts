import type { QualificationKind } from '../../enums.js';
import type { CategoryDefinition, ServiceDefinition } from '../types.js';
import { CHILDCARE } from './childcare.js';
import { ELDERLY_CARE } from './elderly-care.js';
import { PATIENT_CARE } from './patient-care.js';
import { NURSING } from './nursing.js';
import { PET_CARE } from './pet-care.js';
import { DISABILITY_CARE } from './disability-care.js';
import { PERSONAL_ASSISTANCE } from './personal-assistance.js';
import { HOME_HELP } from './home-help.js';

/**
 * Source of truth for categories and services. Order = display order.
 * The database mirrors these rows (`npm run db:seed` syncs them); slugs are the sync keys and must stay stable.
 * Removing an entry deactivates it in the database — existing offerings and requests keep their history.
 */
export const CATEGORIES = [CHILDCARE, ELDERLY_CARE, PATIENT_CARE, NURSING, PET_CARE, DISABILITY_CARE, PERSONAL_ASSISTANCE, HOME_HELP] as const satisfies readonly CategoryDefinition[];

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];
export type ServiceSlug = (typeof CATEGORIES)[number]['services'][number]['slug'];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as CategorySlug[];

const bySlug = new Map<string, CategoryDefinition>(CATEGORIES.map((c) => [c.slug, c]));
const serviceIndex = new Map<string, { service: ServiceDefinition; category: CategoryDefinition }>(
  CATEGORIES.flatMap((category) => category.services.map((service) => [service.slug, { service, category }] as const)),
);

export function findCategory(slug: string | null | undefined): CategoryDefinition | undefined {
  return slug ? bySlug.get(slug) : undefined;
}

export function findService(slug: string | null | undefined) {
  return slug ? serviceIndex.get(slug) : undefined;
}

/** Effective credential requirement: service-level, else category-level. */
export function requiredQualificationFor(service: ServiceDefinition, category: CategoryDefinition): QualificationKind | null {
  return service.requiredQualification ?? category.requiredQualification ?? null;
}

export function relevantQualificationsFor(categorySlug?: string | null): readonly QualificationKind[] {
  return findCategory(categorySlug)?.relevantQualifications ?? ['IDENTITY'];
}

export { CHILDCARE, ELDERLY_CARE, PATIENT_CARE, NURSING, PET_CARE, DISABILITY_CARE, PERSONAL_ASSISTANCE, HOME_HELP };
