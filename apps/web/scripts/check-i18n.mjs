#!/usr/bin/env node
/**
 * Translation checks:
 *  1. hy / ru / en dictionaries have identical key sets (and equal array lengths);
 *  2. every statically referenced key (t('…'), tm('…'), keypath="…") exists;
 *  3. every key family built from shared enums (statuses, error codes, notification types…) is complete;
 *  4. no empty Armenian strings except intentionally blank action hints.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as shared from '@carely/shared';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (l) => JSON.parse(readFileSync(join(root, 'i18n/locales', `${l}.json`), 'utf8'));
const dicts = { hy: load('hy'), ru: load('ru'), en: load('en') };
const errors = [];

function flatten(obj, prefix = '', out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v)) out.set(key, `array:${v.length}`);
    else if (v && typeof v === 'object') flatten(v, key, out);
    else out.set(key, v);
  }
  return out;
}
const flat = Object.fromEntries(Object.entries(dicts).map(([l, d]) => [l, flatten(d)]));

// 1. parity
for (const l of ['ru', 'en']) {
  for (const k of flat.hy.keys()) if (!flat[l].has(k)) errors.push(`[${l}] missing key: ${k}`);
  for (const k of flat[l].keys()) if (!flat.hy.has(k)) errors.push(`[${l}] extra key not in hy: ${k}`);
  for (const [k, v] of flat.hy) if (String(v).startsWith('array:') && flat[l].get(k) !== v) errors.push(`[${l}] array length differs: ${k}`);
}

// 2. static references
function walk(dir, files = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (/\.(vue|ts)$/.test(f)) files.push(p);
  }
  return files;
}
const has = (k) => flat.hy.has(k) || [...flat.hy.keys()].some((x) => x.startsWith(k + '.'));
for (const file of walk(join(root, 'app'))) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/\b(?:t|tm|te)\(\s*['"]([a-zA-Z0-9_.]+)['"]/g)) if (!has(m[1])) errors.push(`missing key used in ${file.replace(root + '/', '')}: ${m[1]}`);
  for (const m of src.matchAll(/keypath="([a-zA-Z0-9_.]+)"/g)) if (!has(m[1])) errors.push(`missing keypath in ${file}: ${m[1]}`);
}

// 3. enum families
const families = {
  requestStatus: shared.REQUEST_STATUSES,
  profileStatus: shared.PROFILE_STATUSES,
  reviewStatus: shared.REVIEW_STATUSES,
  verificationStatus: shared.VERIFICATION_STATUSES,
  'verification.kind': shared.QUALIFICATION_KINDS,
  supportTopic: shared.SUPPORT_TOPICS,
  supportStatus: shared.SUPPORT_STATUSES,
  userStatus: shared.USER_STATUSES,
  locationType: shared.LOCATION_TYPES,
  attributeGroup: shared.ATTRIBUTE_GROUPS,
  payType: shared.PAY_TYPES,
  education: shared.EDUCATION_LEVELS,
  leadStatus: shared.LEAD_STATUSES,
  leadSource: shared.LEAD_SOURCES,
  priceUnit: shared.PRICE_UNITS,
  priceUnitLong: shared.PRICE_UNITS,
  lang: shared.SPOKEN_LANGUAGES,
  errors: shared.ERROR_CODES,
  notifications: shared.NOTIFICATION_TYPES,
  'onboarding.step': shared.ONBOARDING_STEPS,
  'onboarding.help': shared.ONBOARDING_STEPS,
  'pro.statusText': shared.PROFILE_STATUSES,
  'request.type': shared.SCHEDULE_TYPES,
  'request.actionHint.CUSTOMER': shared.REQUEST_STATUSES,
  'request.actionHint.PROFESSIONAL': shared.REQUEST_STATUSES,
  requestEvent: ['CREATED', 'ACCEPTED', 'DECLINED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'EXPIRED'],
  eventActor: ['CUSTOMER', 'PROFESSIONAL', 'SYSTEM', 'ADMIN'],
  'search.sort': shared.SEARCH_SORTS,
  validation: ['required', 'invalid', 'too_long', 'too_many', 'email_invalid', 'password_min', 'phone_invalid', 'terms_required', 'select_at_least_one', 'price_required', 'price_min', 'end_before_start', 'slug_invalid', 'overlap', 'email_taken', 'password_wrong', 'age_invalid', 'date_in_past'],
};
// Most families key their translations by the raw enum value (DB/API casing). A few namespaces use a
// lowercase/camelCase key instead (e.g. `education.secondary`, looked up as `education.${level.toLowerCase()}`).
const familyKeyOf = { education: (v) => v.toLowerCase() };
for (const [prefix, values] of Object.entries(families)) {
  const keyOf = familyKeyOf[prefix] ?? ((v) => v);
  for (const v of values) if (!flat.hy.has(`${prefix}.${keyOf(v)}`)) errors.push(`missing enum key: ${prefix}.${keyOf(v)}`);
}

// 4. empties (hy is the editorial source)
for (const [k, v] of flat.hy) if (v === '' && !k.startsWith('request.actionHint.')) errors.push(`empty Armenian string: ${k}`);

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n✗ ${errors.length} translation problem(s)`);
  process.exit(1);
}
console.log(`✓ i18n OK — ${flat.hy.size} keys in hy/ru/en, all referenced keys and enum families present`);
