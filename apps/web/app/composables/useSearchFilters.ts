import type { LocationQuery } from 'vue-router';
import { relevantQualificationsFor, type EducationLevel, type PriceKind, type PriceUnit, type QualificationKind, type SearchSort } from '@carely/shared';

export interface Filters {
  category?: string;
  service?: string;
  location?: string;
  priceUnit?: PriceUnit;
  priceKind?: PriceKind;
  priceMin?: number;
  priceMax?: number;
  experienceMin?: number;
  ageMin?: number;
  ageMax?: number;
  educationMin?: EducationLevel;
  ratingMin?: number;
  languages: string[];
  attributes: string[];
  verified: QualificationKind[];
  date?: string;
  timeFrom?: string;
  timeTo?: string;
  startBy?: string;
  sort: SearchSort;
  page: number;
}

const list = (v: unknown) => (typeof v === 'string' && v ? v.split(',') : Array.isArray(v) ? (v as string[]) : []);
const num = (v: unknown) => (typeof v === 'string' && v !== '' && !isNaN(Number(v)) ? Number(v) : undefined);
const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

export function parseFilters(q: LocationQuery): Filters {
  return {
    category: str(q.category),
    service: str(q.service),
    location: str(q.location),
    priceUnit: str(q.priceUnit) as PriceUnit | undefined,
    priceKind: str(q.priceKind) as PriceKind | undefined,
    priceMin: num(q.priceMin),
    priceMax: num(q.priceMax),
    experienceMin: num(q.experienceMin),
    ageMin: num(q.ageMin),
    ageMax: num(q.ageMax),
    educationMin: str(q.educationMin) as EducationLevel | undefined,
    ratingMin: num(q.ratingMin),
    languages: list(q.languages),
    attributes: list(q.attributes),
    verified: list(q.verified) as QualificationKind[],
    date: str(q.date),
    timeFrom: str(q.timeFrom),
    timeTo: str(q.timeTo),
    startBy: str(q.startBy),
    sort: (str(q.sort) as SearchSort) ?? 'relevance',
    page: num(q.page) ?? 1,
  };
}

/** Shareable URL query; empty values are omitted. */
export function toQuery(f: Partial<Filters>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) {
      if (v.length) out[k] = v.join(',');
    } else if (k === 'sort' && v === 'relevance') continue;
    else if (k === 'page' && v === 1) continue;
    else out[k] = String(v);
  }
  return out;
}

/** Credentials that are meaningful filters for a category (code-managed in @carely/shared). */
export const qualificationsFor = (categorySlug?: string): QualificationKind[] => [...relevantQualificationsFor(categorySlug)];

export function activeFilterCount(f: Filters) {
  return (
    (f.service ? 1 : 0) +
    (f.priceMin != null || f.priceMax != null || f.priceKind || f.priceUnit ? 1 : 0) +
    (f.experienceMin ? 1 : 0) +
    (f.ageMin != null || f.ageMax != null ? 1 : 0) +
    (f.educationMin ? 1 : 0) +
    (f.ratingMin != null ? 1 : 0) +
    (f.startBy ? 1 : 0) +
    f.languages.length +
    f.attributes.length +
    f.verified.length +
    (f.date ? 1 : 0)
  );
}
