<script setup lang="ts">
import { Check, Upload, Eye } from 'lucide-vue-next';
import {
  ONBOARDING_STEPS,
  PRICE_UNITS,
  SPOKEN_LANGUAGES,
  EDUCATION_LEVELS,
  AGE_LIMITS,
  LIMITS,
  utcToZonedDate,
  onboardingIntroSchema,
  onboardingServicesSchema,
  onboardingExperienceSchema,
  onboardingAreaSchema,
  onboardingLanguagesSchema,
  onboardingPricesSchema,
  onboardingScheduleSchema,
  type OnboardingStep,
} from '@carely/shared';

/** Resumable professional onboarding. Every step saves a draft on the server; submission sends it for admin review. */
const props = defineProps<{ mode: 'onboarding' | 'edit' }>();
const { t } = useI18n();
const { profile, load, save } = useProProfile();
const { categories, load: loadTx, categoryById, locationById, facetGroups } = useTaxonomy();
const { tx, price } = useFormat();
const toast = useToast();
const errMsg = useErrorMessage();
const { progress, upload } = useUpload();
const localePath = useLocalePath();
const auth = useAuthStore();
await Promise.all([loadTx(), load()]);
if (!profile.value) await save('', {}, 'POST');

const p = computed(() => profile.value!);
const stepIndex = ref(props.mode === 'onboarding' ? Math.min(p.value.onboardingStep, ONBOARDING_STEPS.length - 1) : 0);
const step = computed<OnboardingStep>(() => ONBOARDING_STEPS[stepIndex.value]!);
const { errors, fromZod, set, clear } = useFieldErrors();
const busy = ref(false);
const stepDone = (s: OnboardingStep) => {
  const c = p.value.completeness as Record<string, boolean>;
  if (s === 'documents') return p.value.onboardingStep >= 8;
  if (s === 'preview') return p.value.status === 'PENDING' || p.value.status === 'APPROVED';
  return !!c[s];
};

// ── Local step state, initialized from the saved draft ──
const intro = reactive({ ...p.value.intro });
const services = reactive({ categoryId: p.value.services.categoryId ?? '', serviceIds: [...p.value.services.serviceIds], attributeIds: [...p.value.services.attributeIds] });
const experience = reactive({ ...p.value.experience, availableFrom: p.value.experience.availableFrom ?? '' });
const thisYear = Number(utcToZonedDate(new Date()).slice(0, 4));
const today = utcToZonedDate(new Date());
const area = reactive({ homeLocationId: p.value.area.homeLocationId ?? undefined, serviceAreaIds: [...p.value.area.serviceAreaIds] });
const languages = ref<string[]>([...p.value.languages]);
const offerings = ref(p.value.offerings.map((o) => ({ ...o })));
const rules = ref(p.value.rules.map((r) => ({ ...r })));
watch(profile, (v) => {
  if (!v) return;
  offerings.value = v.offerings.map((o) => ({ ...o }));
});

const cat = computed(() => categoryById(services.categoryId));
const attrGroups = computed(() => (cat.value ? facetGroups(cat.value.slug) : []));
/** Facets are global; on a category change only the options restricted to other categories are dropped. */
function onCategoryChange() {
  services.serviceIds = [];
  const allowed = new Set(attrGroups.value.flatMap((g) => g.items.map((a) => a.id)));
  services.attributeIds = services.attributeIds.filter((id) => allowed.has(id));
}
const locationOptions = useLocationOptions(undefined, 'id');
const serviceName = (id: string) => tx(cat.value?.services.find((s) => s.id === id)?.name ?? categories.value?.flatMap((c) => c.services).find((s) => s.id === id)?.name);

async function persist(path: string, schema: any, body: any) {
  clear();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    fromZod(parsed.error.issues);
    return false;
  }
  busy.value = true;
  try {
    await save(path, parsed.data);
    return true;
  } catch (e) {
    set(e);
    toast.error(errMsg(e));
    return false;
  } finally {
    busy.value = false;
  }
}

async function saveStep(): Promise<boolean> {
  switch (step.value) {
    case 'intro':
      return persist('/intro', onboardingIntroSchema, intro);
    case 'services':
      return persist('/services', onboardingServicesSchema, services);
    case 'experience':
      return persist('/experience', onboardingExperienceSchema, experience);
    case 'area':
      return persist('/area', onboardingAreaSchema, area);
    case 'languages':
      return persist('/languages', onboardingLanguagesSchema, { languages: languages.value });
    case 'prices':
      return persist('/prices', onboardingPricesSchema, { offerings: offerings.value.map((o) => ({ ...o, priceAmount: o.priceKind === 'FIXED' ? Number(o.priceAmount) || null : null })) });
    case 'schedule':
      return persist('/schedule', onboardingScheduleSchema, { rules: rules.value });
    default:
      return true;
  }
}
async function next() {
  if (!(await saveStep())) return;
  if (step.value === 'documents' && p.value.onboardingStep < 8) {
    // Documents are optional; record that the step was visited.
    await save('/documents-step', {}, 'POST').catch(() => undefined);
  }
  if (props.mode === 'edit') toast.success(t('settings.saved'));
  if (stepIndex.value < ONBOARDING_STEPS.length - 1) {
    stepIndex.value++;
    if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
function back() {
  if (stepIndex.value > 0) stepIndex.value--;
}
async function goTo(i: number) {
  stepIndex.value = i;
}

async function onPortrait(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  (e.target as HTMLInputElement).value = '';
  if (!file) return;
  if (file.size > LIMITS.portraitMaxBytes) return toast.error(t('errors.FILE_TOO_LARGE', { maxMb: LIMITS.portraitMaxBytes / 1024 / 1024 }));
  try {
    const res = await upload<{ id: string; url: string }>('/me/portrait', file);
    intro.portraitMediaId = res.id;
    intro.portraitUrl = res.url;
  } catch (err) {
    toast.error(errMsg(err));
  }
}

const missing = computed(() => Object.entries(p.value.completeness).filter(([, ok]) => !ok).map(([k]) => k));
async function submit() {
  busy.value = true;
  try {
    await save('/submit', {}, 'POST');
    await auth.fetch();
    toast.success(t('onboarding.submitted'));
    await navigateTo(localePath('/pro'));
  } catch (e) {
    toast.error(errMsg(e));
  } finally {
    busy.value = false;
  }
}

// Optional author-supplied translations of headline/bio.
const otherLocales = computed(() => (['hy', 'ru', 'en'] as const).filter((l) => l !== intro.originalLocale));
const translations = reactive<Record<string, { headline: string; bio: string }>>(
  Object.fromEntries((['hy', 'ru', 'en'] as const).map((l) => [l, { headline: p.value.translations.find((x) => x.locale === l)?.headline ?? '', bio: p.value.translations.find((x) => x.locale === l)?.bio ?? '' }])),
);
async function saveTranslation(l: string) {
  try {
    await save('/translations', { locale: l, ...translations[l] });
    toast.success(t('settings.saved'));
  } catch (e) {
    toast.error(errMsg(e));
  }
}
const langNames: Record<string, string> = { hy: 'Հայերեն', ru: 'Русский', en: 'English' };
</script>

<template>
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
    <nav :aria-label="t('onboarding.steps')" class="min-w-0 lg:sticky lg:top-24 lg:self-start">
      <ol class="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        <li v-for="(s, i) in ONBOARDING_STEPS" :key="s" class="shrink-0">
          <button
            type="button"
            class="flex min-h-10 w-full items-center gap-2.5 rounded-[var(--radius-control)] px-3 text-left text-[0.9375rem]"
            :class="i === stepIndex ? 'bg-surface font-medium text-primary shadow-[var(--shadow-card)]' : 'text-[#475467] hover:bg-surface/70'"
            :aria-current="i === stepIndex ? 'step' : undefined"
            :disabled="mode === 'onboarding' && i > p.onboardingStep"
            @click="goTo(i)"
          >
            <span class="flex size-6 shrink-0 items-center justify-center rounded-full text-xs" :class="stepDone(s) ? 'bg-primary text-white' : 'border border-line-strong'">
              <Check v-if="stepDone(s)" class="size-3.5" aria-hidden="true" /><template v-else>{{ i + 1 }}</template>
            </span>
            {{ t(`onboarding.step.${s}`) }}
          </button>
        </li>
      </ol>
    </nav>

    <UiCard class="min-w-0">
      <h2 class="text-xl font-semibold">{{ t(`onboarding.step.${step}`) }}</h2>
      <p class="mt-1 text-muted">{{ t(`onboarding.help.${step}`) }}</p>

      <div class="mt-6 space-y-5">
        <!-- Intro -->
        <template v-if="step === 'intro'">
          <div class="flex items-center gap-4">
            <UiAvatar :src="intro.portraitUrl" :name="intro.displayName || '?'" :size="88" />
            <div>
              <label class="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-line-strong px-3 text-sm font-medium hover:bg-bg has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary-ring">
                <Upload class="size-4" aria-hidden="true" />{{ t('onboarding.uploadPortrait') }}
                <input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" @change="onPortrait" />
              </label>
              <p class="field-help">{{ t('onboarding.portraitHelp') }}</p>
              <div v-if="progress != null" class="mt-2 h-2 w-48 overflow-hidden rounded-full bg-bg" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100"><div class="h-full bg-primary" :style="{ width: progress + '%' }" /></div>
            </div>
          </div>
          <UiInput v-model="intro.displayName" :label="t('onboarding.displayName')" :error="errors.displayName" :help="t('onboarding.displayNameHelp')" required />
          <UiInput v-model="intro.headline" :label="t('onboarding.headline')" :error="errors.headline" :maxlength="LIMITS.headlineMax" :help="t('onboarding.headlineHelp')" required />
          <UiSelect
            v-model="intro.originalLocale"
            :label="t('onboarding.writingLanguage')"
            :options="[
              { value: 'hy', label: 'Հայերեն' },
              { value: 'ru', label: 'Русский' },
              { value: 'en', label: 'English' },
            ]"
          />
          <UiTextarea v-model="intro.bio" :label="t('onboarding.bio')" :help="t('onboarding.bioHelp')" :error="errors.bio" :maxlength="LIMITS.bioMax" :rows="6" required />
          <UiInput v-model="intro.phone" type="tel" :label="t('auth.phone')" :help="t('onboarding.phoneHelp')" :error="errors.phone" placeholder="+374 XX XXXXXX" required />
          <details v-if="mode === 'edit'" class="rounded-[var(--radius-control)] border border-line p-4">
            <summary class="cursor-pointer font-medium">{{ t('onboarding.translations') }}</summary>
            <p class="mt-2 text-sm text-muted">{{ t('onboarding.translationsHelp') }}</p>
            <div v-for="l in otherLocales" :key="l" class="mt-4 space-y-3 border-t border-line pt-4">
              <p class="font-medium">{{ langNames[l] }}</p>
              <UiInput v-model="translations[l]!.headline" :label="t('onboarding.headline')" :maxlength="LIMITS.headlineMax" />
              <UiTextarea v-model="translations[l]!.bio" :label="t('onboarding.bio')" :maxlength="LIMITS.bioMax" :rows="4" />
              <UiButton variant="secondary" size="sm" @click="saveTranslation(l)">{{ t('common.save') }}</UiButton>
            </div>
          </details>
        </template>

        <!-- Services -->
        <template v-else-if="step === 'services'">
          <fieldset>
            <legend class="field-label">{{ t('onboarding.category') }}</legend>
            <div class="grid gap-2 sm:grid-cols-2">
              <label v-for="c in categories ?? []" :key="c.id" class="flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border border-line-strong px-3 has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
                <input v-model="services.categoryId" type="radio" :value="c.id" class="size-4 accent-primary" @change="onCategoryChange" />
                <AppCategoryIcon :slug="c.slug" class="size-5 text-primary" />{{ tx(c.name) }}
              </label>
            </div>
            <p v-if="errors.categoryId" class="field-error">{{ errors.categoryId }}</p>
          </fieldset>
          <fieldset v-if="cat">
            <legend class="field-label">{{ t('onboarding.services') }}</legend>
            <UiCheckbox
              v-for="s in cat.services"
              :key="s.id"
              v-model="services.serviceIds"
              :value="s.id"
              :label="tx(s.name)"
              :hint="s.requiredQualification ? t('onboarding.requiresQualification', { q: t(`verification.kind.${s.requiredQualification}`) }) : undefined"
            />
            <p v-if="errors.serviceIds" class="field-error">{{ errors.serviceIds }}</p>
          </fieldset>
          <fieldset v-for="g in attrGroups" :key="g.group">
            <legend class="field-label">{{ t(`attributeGroup.${g.group}`) }}</legend>
            <div class="grid sm:grid-cols-2"><UiCheckbox v-for="a in g.items" :key="a.id" v-model="services.attributeIds" :value="a.id" :label="tx(a.name)" /></div>
          </fieldset>
          <UiAlert v-if="mode === 'edit' && p.status === 'APPROVED'" tone="warning">{{ t('onboarding.materialChange') }}</UiAlert>
        </template>

        <!-- Experience -->
        <template v-else-if="step === 'experience'">
          <UiInput v-model.number="experience.experienceYears" type="number" min="0" max="60" inputmode="numeric" :label="t('onboarding.years')" :error="errors.experienceYears" class="max-w-xs" required />
          <UiTextarea v-model="experience.experienceSummary" :label="t('onboarding.experienceSummary')" :help="t('onboarding.experienceSummaryHelp')" :maxlength="1000" :rows="4" />
          <div class="grid gap-4 sm:grid-cols-2">
            <UiInput
              v-model.number="experience.birthYear"
              type="number"
              inputmode="numeric"
              :min="thisYear - AGE_LIMITS.max"
              :max="thisYear - AGE_LIMITS.min"
              :label="t('onboarding.birthYear')"
              :help="t('onboarding.birthYearHelp')"
              :error="errors.birthYear"
              required
            />
            <UiSelect
              v-model="experience.educationLevel"
              :label="t('onboarding.education')"
              :placeholder="t('onboarding.educationPlaceholder')"
              :options="EDUCATION_LEVELS.map((e) => ({ value: e, label: t(`education.${e.toLowerCase()}`) }))"
              :error="errors.educationLevel"
              required
            />
          </div>
          <UiDateField v-model="experience.availableFrom" :min="today" :label="t('onboarding.availableFrom')" :help="t('onboarding.availableFromHelp')" :error="errors.availableFrom" class="max-w-xs" />
          <p class="text-sm text-muted">{{ t('onboarding.qualificationsLater') }}</p>
        </template>

        <!-- Area -->
        <template v-else-if="step === 'area'">
          <UiCombobox v-model="area.homeLocationId" :label="t('onboarding.homeLocation')" :help="t('onboarding.homeLocationHelp')" :options="locationOptions" :error="errors.homeLocationId" />
          <fieldset>
            <legend class="field-label">{{ t('onboarding.serviceAreas') }}</legend>
            <p class="field-help -mt-1 mb-2">{{ t('onboarding.serviceAreasHelp') }}</p>
            <div class="max-h-80 overflow-y-auto rounded-[var(--radius-control)] border border-line p-2">
              <UiCheckbox v-for="o in locationOptions" :key="o.value" v-model="area.serviceAreaIds" :value="o.value" :label="o.label" :class="o.parent ? 'pl-6' : 'font-medium'" />
            </div>
            <p v-if="errors.serviceAreaIds" class="field-error">{{ errors.serviceAreaIds }}</p>
            <p class="mt-2 text-sm text-muted">{{ t('onboarding.selected', { n: area.serviceAreaIds.length }) }}: {{ area.serviceAreaIds.map((id) => tx(locationById(id)?.name)).join(', ') }}</p>
          </fieldset>
        </template>

        <!-- Languages -->
        <template v-else-if="step === 'languages'">
          <div class="grid gap-x-4 sm:grid-cols-3"><UiCheckbox v-for="l in SPOKEN_LANGUAGES" :key="l" v-model="languages" :value="l" :label="t(`lang.${l}`)" /></div>
          <p v-if="errors.languages" class="field-error">{{ errors.languages }}</p>
        </template>

        <!-- Prices -->
        <template v-else-if="step === 'prices'">
          <p v-if="!offerings.length" class="text-muted">{{ t('onboarding.selectServicesFirst') }}</p>
          <div v-for="(o, i) in offerings" :key="o.serviceId" class="rounded-[var(--radius-control)] border border-line p-4">
            <p class="font-medium">{{ serviceName(o.serviceId) }}</p>
            <div class="mt-3 grid gap-3 sm:grid-cols-3">
              <UiSelect
                v-model="o.priceKind"
                :label="t('onboarding.priceKind')"
                :options="[
                  { value: 'FIXED', label: t('onboarding.priceFixed') },
                  { value: 'NEGOTIABLE', label: t('price.negotiable') },
                ]"
              />
              <UiInput v-if="o.priceKind === 'FIXED'" v-model.number="o.priceAmount" type="number" min="100" step="100" inputmode="numeric" :label="t('onboarding.amount')" :error="errors[`offerings.${i}.priceAmount`]" />
              <UiSelect v-model="o.priceUnit" :label="t('onboarding.unit')" :options="PRICE_UNITS.map((u) => ({ value: u, label: t(`priceUnitLong.${u}`) }))" />
            </div>
          </div>
          <p class="text-sm text-muted">{{ t('onboarding.priceHelp') }}</p>
        </template>

        <!-- Schedule -->
        <template v-else-if="step === 'schedule'">
          <AppWeeklyScheduleEditor v-model="rules" />
          <p v-if="errors.rules" class="field-error">{{ errors.rules }}</p>
        </template>

        <!-- Documents -->
        <template v-else-if="step === 'documents'">
          <AppQualificationsEditor :items="p.qualifications" />
        </template>

        <!-- Preview -->
        <template v-else-if="step === 'preview'">
          <div class="flex items-start gap-4 rounded-[var(--radius-card)] bg-bg p-4">
            <UiAvatar :src="p.intro.portraitUrl" :name="p.intro.displayName" :size="72" />
            <div class="min-w-0">
              <p class="text-lg font-semibold">{{ p.intro.displayName }}</p>
              <p class="text-[#475467]">{{ p.intro.headline }}</p>
              <p class="mt-1 text-sm text-muted">{{ tx(categoryById(p.services.categoryId)?.name) }} · {{ t('card.experience', p.experience.experienceYears) }} · {{ tx(locationById(p.area.homeLocationId)?.name) }}</p>
            </div>
          </div>
          <p class="whitespace-pre-line text-[#344054]">{{ p.intro.bio }}</p>
          <ul class="divide-y divide-line rounded-[var(--radius-control)] border border-line">
            <li v-for="o in p.offerings" :key="o.serviceId" class="flex justify-between gap-3 px-4 py-2.5">
              <span>{{ serviceName(o.serviceId) }}</span><span class="font-medium">{{ price({ kind: o.priceKind, amount: o.priceAmount, unit: o.priceUnit }) }}</span>
            </li>
          </ul>
          <UiAlert v-if="missing.length" tone="warning" :title="t('onboarding.incomplete')">
            <ul class="list-disc pl-5">
              <li v-for="m in missing" :key="m"><button type="button" class="underline" @click="goTo(ONBOARDING_STEPS.indexOf(m as OnboardingStep))">{{ t(`onboarding.step.${m}`) }}</button></li>
            </ul>
          </UiAlert>
          <UiAlert v-if="p.status === 'PENDING'" tone="info">{{ t('onboarding.pendingNotice') }}</UiAlert>
          <UiAlert v-else-if="p.status === 'APPROVED'" tone="success">{{ t('onboarding.approvedNotice') }}</UiAlert>
          <UiAlert v-else-if="p.status === 'REJECTED'" tone="danger" :title="t('onboarding.rejectedTitle')">{{ p.rejectionReason }}</UiAlert>
          <p class="text-sm text-muted">{{ t('onboarding.reviewNote') }}</p>
        </template>
      </div>

      <div class="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <UiButton v-if="stepIndex > 0" variant="ghost" @click="back">{{ t('common.back') }}</UiButton>
        <span v-else />
        <div class="flex gap-2">
          <UiButton v-if="step === 'preview' && p.status === 'APPROVED'" variant="secondary" :to="localePath(`/professionals/${p.slug}`)"><Eye class="size-4" aria-hidden="true" />{{ t('onboarding.viewPublic') }}</UiButton>
          <UiButton v-if="step !== 'preview'" :loading="busy" @click="next">{{ mode === 'edit' ? t('common.saveContinue') : t('common.continue') }}</UiButton>
          <UiButton v-else-if="p.status === 'DRAFT' || p.status === 'REJECTED'" :loading="busy" :disabled="missing.length > 0" @click="submit">{{ t('onboarding.submit') }}</UiButton>
        </div>
      </div>
    </UiCard>
  </div>
</template>
