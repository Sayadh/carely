<script setup lang="ts">
import { AGE_LIMITS, EDUCATION_LEVELS, PAY_TYPES, RATING_FILTER_OPTIONS, SPOKEN_LANGUAGES, utcToZonedDate, type PayType } from '@carely/shared';
import type { Filters } from '~/composables/useSearchFilters';
import { qualificationsFor } from '~/composables/useSearchFilters';

/** Filters only offer options backed by the data model and API. Global facets show for every category; restricted options only where they apply. */
const model = defineModel<Filters>({ required: true });
const emit = defineEmits<{ commit: [] }>();
const props = defineProps<{ live?: boolean }>();
const { t } = useI18n();
const { categories, categoryBySlug, facetGroups } = useTaxonomy();
const { tx } = useFormat();
const locationOptions = useLocationOptions();
// The filters render twice (desktop sidebar + mobile drawer); a per-instance radio group name keeps them independent.
const radioName = `${useId()}-category`;

const cat = computed(() => categoryBySlug(model.value.category));
const groups = computed(() => facetGroups(model.value.category));
const quals = computed(() => qualificationsFor(model.value.category));
const today = utcToZonedDate(new Date());

function patch(p: Partial<Filters>) {
  model.value = { ...model.value, ...p, page: 1 };
  if (props.live) emit('commit');
}
function setCategory(slug?: string) {
  // Category-specific choices are cleared when the category changes; facets restricted to other categories are dropped.
  const allowed = new Set(facetGroups(slug).flatMap((g) => g.items.map((a) => a.slug)));
  const keepQuals = new Set(qualificationsFor(slug));
  patch({ category: slug, service: undefined, attributes: model.value.attributes.filter((a) => allowed.has(a)), verified: model.value.verified.filter((v) => keepQuals.has(v)) });
}

// ── Pay ("Վարձատրություն"): a unit with an optional range, or a negotiated price ──
const payType = computed<PayType | ''>(() => (model.value.priceKind === 'NEGOTIABLE' ? 'NEGOTIABLE' : (model.value.priceUnit ?? '')));
function setPayType(v: PayType | '') {
  if (v === 'NEGOTIABLE') patch({ priceKind: 'NEGOTIABLE', priceUnit: undefined, priceMin: undefined, priceMax: undefined });
  else patch({ priceKind: undefined, priceUnit: v || undefined, ...(v ? {} : { priceMin: undefined, priceMax: undefined }) });
}
const priceMin = ref(model.value.priceMin);
const priceMax = ref(model.value.priceMax);
watch(() => [model.value.priceMin, model.value.priceMax], ([a, b]) => ((priceMin.value = a), (priceMax.value = b)));
function commitPrice() {
  patch({ priceMin: priceMin.value || undefined, priceMax: priceMax.value || undefined, priceUnit: model.value.priceUnit ?? 'HOUR' });
}

// ── Age range: committed on blur so typing does not reload results on every key ──
const ageMin = ref(model.value.ageMin);
const ageMax = ref(model.value.ageMax);
watch(() => [model.value.ageMin, model.value.ageMax], ([a, b]) => ((ageMin.value = a), (ageMax.value = b)));
const clampAge = (v?: number | string | null) => (v === '' || v == null || isNaN(Number(v)) ? undefined : Math.min(AGE_LIMITS.max, Math.max(AGE_LIMITS.min, Math.round(Number(v)))));
function commitAge() {
  let lo = clampAge(ageMin.value);
  let hi = clampAge(ageMax.value);
  if (lo != null && hi != null && lo > hi) [lo, hi] = [hi, lo];
  patch({ ageMin: lo, ageMax: hi });
}

// ── Date + optional time window (both times or neither) ──
const timeFrom = ref(model.value.timeFrom);
const timeTo = ref(model.value.timeTo);
watch(() => [model.value.timeFrom, model.value.timeTo], ([a, b]) => ((timeFrom.value = a), (timeTo.value = b)));
const timeError = computed(() => (timeFrom.value && timeTo.value && timeTo.value <= timeFrom.value ? t('validation.end_before_start') : undefined));
function commitTime() {
  if (timeError.value) return;
  if (timeFrom.value && timeTo.value) patch({ timeFrom: timeFrom.value, timeTo: timeTo.value });
  else if (!timeFrom.value && !timeTo.value && (model.value.timeFrom || model.value.timeTo)) patch({ timeFrom: undefined, timeTo: undefined });
}
function setDate(v?: string) {
  patch({ date: v || undefined, ...(v ? {} : { timeFrom: undefined, timeTo: undefined }) });
}

function toggle(key: 'languages' | 'attributes' | 'verified', value: string, on: boolean) {
  const cur = new Set(model.value[key] as string[]);
  on ? cur.add(value) : cur.delete(value);
  patch({ [key]: [...cur] } as Partial<Filters>);
}
</script>

<template>
  <div class="space-y-6">
    <fieldset>
      <legend class="field-label">{{ t('filters.category') }}</legend>
      <div class="space-y-1">
        <label class="flex min-h-10 cursor-pointer items-center gap-3">
          <input type="radio" :name="radioName" class="size-4 accent-primary" :checked="!model.category" @change="setCategory(undefined)" />
          <span>{{ t('filters.allCategories') }}</span>
        </label>
        <label v-for="c in categories ?? []" :key="c.id" class="flex min-h-10 cursor-pointer items-center gap-3">
          <input type="radio" :name="radioName" class="size-4 accent-primary" :checked="model.category === c.slug" @change="setCategory(c.slug)" />
          <span>{{ tx(c.name) }}</span>
        </label>
      </div>
    </fieldset>

    <UiSelect
      v-if="cat"
      :model-value="model.service"
      :label="t('filters.service')"
      :placeholder="t('filters.anyService')"
      :options="cat.services.map((s) => ({ value: s.slug, label: tx(s.name) }))"
      @update:model-value="(v) => patch({ service: (v as string) || undefined })"
    />

    <UiCombobox
      :model-value="model.location"
      :label="t('filters.location')"
      :placeholder="t('search.anyLocation')"
      :options="locationOptions"
      :help="t('filters.locationHelp')"
      clearable
      @update:model-value="(v) => patch({ location: v })"
    />

    <fieldset>
      <legend class="sr-only">{{ t('filters.date') }}</legend>
      <UiDateField :model-value="model.date" :label="t('filters.date')" :min="today" :help="t('filters.dateHelp')" @update:model-value="setDate" />
      <div v-if="model.date" class="mt-2 grid grid-cols-2 gap-2">
        <UiDateField v-model="timeFrom" type="time" step="900" :label="t('filters.timeFrom')" @change="commitTime" />
        <UiDateField v-model="timeTo" type="time" step="900" :label="t('filters.timeTo')" :error="timeError" @change="commitTime" />
      </div>
      <p v-if="model.date" class="field-help">{{ t('filters.timeHelp') }}</p>
    </fieldset>

    <fieldset v-for="g in groups" :key="g.group">
      <legend class="field-label">{{ t(`attributeGroup.${g.group}`) }}</legend>
      <UiCheckbox
        v-for="a in g.items"
        :key="a.id"
        :label="tx(a.name)"
        :model-value="model.attributes.includes(a.slug)"
        @update:model-value="(v) => toggle('attributes', a.slug, !!v)"
      />
    </fieldset>

    <fieldset>
      <legend class="field-label">{{ t('filters.pay') }}</legend>
      <UiSelect
        :model-value="payType"
        :label="t('filters.pay')"
        :options="[{ value: '', label: t('filters.anyPay') }, ...PAY_TYPES.map((p) => ({ value: p, label: t(`payType.${p}`) }))]"
        class="[&_.field-label]:sr-only"
        @update:model-value="(v) => setPayType(v as PayType | '')"
      />
      <template v-if="payType !== 'NEGOTIABLE'">
        <div class="mt-2 grid grid-cols-2 gap-2">
          <UiInput v-model.number="priceMin" type="number" inputmode="numeric" min="0" step="500" :label="t('filters.priceMin')" :placeholder="'0'" @blur="commitPrice" @keydown.enter.prevent="commitPrice" />
          <UiInput v-model.number="priceMax" type="number" inputmode="numeric" min="0" step="500" :label="t('filters.priceMax')" :placeholder="'—'" @blur="commitPrice" @keydown.enter.prevent="commitPrice" />
        </div>
        <p class="field-help">{{ t('filters.priceHelp', { unit: t(`priceUnitLong.${model.priceUnit ?? 'HOUR'}`) }) }}</p>
      </template>
    </fieldset>

    <UiSelect
      :model-value="model.experienceMin ?? ''"
      :label="t('filters.experience')"
      :options="[
        { value: '', label: t('filters.anyExperience') },
        ...[1, 3, 5, 10].map((n) => ({ value: n, label: t('filters.experienceMin', n) })),
      ]"
      @update:model-value="(v) => patch({ experienceMin: v ? Number(v) : undefined })"
    />

    <fieldset>
      <legend class="field-label">{{ t('filters.age') }}</legend>
      <div class="grid grid-cols-2 gap-2">
        <UiInput v-model.number="ageMin" type="number" inputmode="numeric" :min="AGE_LIMITS.min" :max="AGE_LIMITS.max" :label="t('filters.ageMin')" :placeholder="String(AGE_LIMITS.min)" @blur="commitAge" @keydown.enter.prevent="commitAge" />
        <UiInput v-model.number="ageMax" type="number" inputmode="numeric" :min="AGE_LIMITS.min" :max="AGE_LIMITS.max" :label="t('filters.ageMax')" :placeholder="String(AGE_LIMITS.max)" @blur="commitAge" @keydown.enter.prevent="commitAge" />
      </div>
    </fieldset>

    <fieldset>
      <legend class="field-label">{{ t('filters.languages') }}</legend>
      <div class="grid grid-cols-2 gap-x-2">
        <UiCheckbox
          v-for="l in SPOKEN_LANGUAGES.slice(0, 6)"
          :key="l"
          :label="t(`lang.${l}`)"
          :model-value="model.languages.includes(l)"
          @update:model-value="(v) => toggle('languages', l, !!v)"
        />
      </div>
    </fieldset>

    <UiSelect
      :model-value="model.educationMin ?? ''"
      :label="t('filters.education')"
      :options="[{ value: '', label: t('filters.anyEducation') }, ...EDUCATION_LEVELS.map((e) => ({ value: e, label: t('filters.educationAtLeast', { level: t(`education.${e.toLowerCase()}`) }) }))]"
      @update:model-value="(v) => patch({ educationMin: (v as any) || undefined })"
    />

    <fieldset>
      <legend class="field-label">{{ t('filters.verified') }}</legend>
      <UiCheckbox
        v-for="q in quals"
        :key="q"
        :label="q === 'IDENTITY' ? t('filters.verifiedPerson') : t(`verification.kind.${q}`)"
        :model-value="model.verified.includes(q)"
        @update:model-value="(v) => toggle('verified', q, !!v)"
      />
    </fieldset>

    <UiSelect
      :model-value="model.ratingMin ?? ''"
      :label="t('filters.rating')"
      :options="[{ value: '', label: t('filters.anyRating') }, ...RATING_FILTER_OPTIONS.map((r) => ({ value: r, label: t('filters.ratingAtLeast', { rating: r.toFixed(1) }) }))]"
      @update:model-value="(v) => patch({ ratingMin: v ? Number(v) : undefined })"
    />

    <UiDateField :model-value="model.startBy" :label="t('filters.startBy')" :min="today" :help="t('filters.startByHelp')" @update:model-value="(v) => patch({ startBy: v || undefined })" />
  </div>
</template>
