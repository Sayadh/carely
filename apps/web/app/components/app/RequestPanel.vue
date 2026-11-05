<script setup lang="ts">
import { CircleCheck, Info } from 'lucide-vue-next';
import { addDays, createLeadSchema, LIMITS, utcToZonedDate } from '@carely/shared';
import type { ProfessionalProfileDto } from '@carely/shared';

/**
 * Request to the Carely team. From a profile (`pro`) it names that professional; without it, it is a general request
 * by category. No account needed: the team calls the client, finds a professional and introduces both sides.
 * The professional is never notified.
 */
const props = defineProps<{ pro?: ProfessionalProfileDto; category?: string }>();
const { t, locale } = useI18n();
const { tx, price } = useFormat();
const api = useApi();
const auth = useAuthStore();
const errMsg = useErrorMessage();
const { categories, locations, load } = useTaxonomy();
await load().catch(() => undefined);

const { state: form, clear } = useDraft(`lead:${props.pro?.slug ?? 'general'}`, () => ({
  name: auth.user?.name ?? '',
  phone: auth.user?.phone ?? '',
  categorySlug: props.category ?? '',
  serviceId: props.pro?.services.length === 1 ? props.pro.services[0]!.service.id : '',
  locationId: '',
  startDate: '',
  endDate: '',
  schedule: '',
  message: '',
  website: '',
}));

// From a profile: that professional's services and service areas. General: services of the chosen category, any place.
const category = computed(() => (categories.value ?? []).find((c) => c.slug === form.value.categorySlug));
const serviceOptions = computed(() =>
  props.pro
    ? props.pro.services.map((s) => ({ value: s.service.id, label: `${tx(s.service.name)} — ${price(s.price)}` }))
    : (category.value?.services ?? []).map((s) => ({ value: s.id, label: tx(s.name) })),
);
watch(
  () => form.value.categorySlug,
  () => {
    if (!props.pro && !serviceOptions.value.some((o) => o.value === form.value.serviceId)) form.value.serviceId = '';
  },
);
const areaIds = computed(() => (props.pro ? (locations.value ?? []).filter((l) => props.pro!.serviceAreas.some((a) => a.slug === l.slug)).map((l) => l.id) : null));
const locationOptions = useLocationOptions(areaIds, 'id');

const today = utcToZonedDate(new Date());
const lastDate = addDays(today, LIMITS.leadDateMaxDays);
// Keep the period valid while picking: an end before the new start is cleared rather than silently kept.
watch(
  () => form.value.startDate,
  (start) => {
    if (start && form.value.endDate && form.value.endDate < start) form.value.endDate = '';
  },
);
const { errors, set: setErrors, fromZod, clear: clearErrors } = useFieldErrors();
const formError = ref('');
const busy = ref(false);
const sent = ref(false);

async function submit() {
  clearErrors();
  formError.value = '';
  const payload = {
    ...form.value,
    professionalSlug: props.pro?.slug,
    categorySlug: props.pro ? undefined : form.value.categorySlug,
    locale: locale.value,
  };
  const parsed = createLeadSchema.safeParse(payload);
  if (!parsed.success) {
    fromZod(parsed.error.issues);
    formError.value = t('request.fixErrors');
    return;
  }
  busy.value = true;
  try {
    await api('/leads', { method: 'POST', body: payload });
    clear();
    sent.value = true;
  } catch (e) {
    setErrors(e);
    formError.value = errMsg(e);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div v-if="sent" class="py-2 text-center" role="status">
    <CircleCheck class="mx-auto size-10 text-success" aria-hidden="true" />
    <p class="mt-3 text-lg font-semibold">{{ t('lead.sentTitle') }}</p>
    <p class="mt-1 text-[0.9375rem] text-[#344054]">{{ t('lead.sentText') }}</p>
    <AppCallButton block class="mt-5" />
  </div>

  <form v-else class="space-y-4" novalidate @submit.prevent="submit">
    <div v-if="pro">
      <p class="text-sm text-muted">{{ t('card.from') }}</p>
      <p class="text-xl font-semibold">{{ price(pro.price) }}</p>
    </div>

    <div class="grid gap-3 sm:grid-cols-2" :class="{ 'lg:grid-cols-1': pro }">
      <UiInput v-model="form.name" :label="t('lead.name')" autocomplete="name" maxlength="80" :error="errors.name" required />
      <UiInput v-model="form.phone" type="tel" :label="t('lead.phone')" autocomplete="tel" inputmode="tel" placeholder="091 23 45 67" :error="errors.phone" required />
    </div>

    <UiSelect
      v-if="!pro"
      v-model="form.categorySlug"
      :label="t('lead.category')"
      :options="[{ value: '', label: t('lead.categoryPlaceholder') }, ...(categories ?? []).map((c) => ({ value: c.slug, label: tx(c.name) }))]"
      :error="errors.categorySlug"
    />
    <UiSelect
      v-if="serviceOptions.length"
      v-model="form.serviceId"
      :label="t('request.service')"
      :options="[{ value: '', label: t('lead.servicePlaceholder') }, ...serviceOptions]"
      :error="errors.serviceId"
    />
    <UiCombobox v-model="form.locationId" :label="t('request.location')" :options="locationOptions" :error="errors.locationId" :placeholder="t('lead.locationPlaceholder')" clearable />
    <fieldset>
      <legend class="field-label">{{ t('lead.period') }}</legend>
      <div class="grid grid-cols-2 gap-3">
        <UiDateField v-model="form.startDate" :label="t('lead.startDate')" :min="today" :max="lastDate" :error="errors.startDate" />
        <UiDateField v-model="form.endDate" :label="t('lead.endDate')" :min="form.startDate || today" :max="lastDate" :error="errors.endDate" />
      </div>
      <p class="field-help">{{ t('lead.periodHelp') }}</p>
    </fieldset>
    <UiInput v-model="form.schedule" :label="t('lead.schedule')" :placeholder="t('lead.schedulePlaceholder')" :maxlength="LIMITS.leadScheduleMax" :error="errors.schedule" />
    <UiTextarea v-model="form.message" :label="t('lead.message')" :help="t('request.requirementsHelp')" :maxlength="LIMITS.leadMessageMax" :rows="3" :error="errors.message" />

    <!-- Honeypot: hidden from people and assistive tech; bots tend to fill it. -->
    <div class="hidden" aria-hidden="true">
      <label>Website <input v-model="form.website" type="text" name="website" tabindex="-1" autocomplete="off" /></label>
    </div>

    <div class="flex gap-2 rounded-[var(--radius-control)] bg-primary-soft p-3 text-sm text-[#22433d]">
      <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>{{ t('lead.notice') }}</p>
    </div>
    <p v-if="formError" class="field-error" role="alert">{{ formError }}</p>
    <UiButton type="submit" block size="lg" :loading="busy">{{ t('request.submit') }}</UiButton>
    <div v-if="useSupportPhone()" class="text-center">
      <p class="mb-2 text-sm text-muted">{{ t('call.orCall') }}</p>
      <AppCallButton block />
    </div>
  </form>
</template>
