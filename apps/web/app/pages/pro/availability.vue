<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next';
import { availabilityExceptionSchema, onboardingScheduleSchema, utcToZonedDate, timeToMinutes } from '@carely/shared';
definePageMeta({ layout: 'dashboard', section: 'pro', middleware: 'auth' });
const { t } = useI18n();
const { profile, load, save } = useProProfile();
const toast = useToast();
const errMsg = useErrorMessage();
const { ymd, minutes } = useFormat();
const localePath = useLocalePath();
await load();
useSeoMeta({ title: () => t('pro.nav.availability'), robots: 'noindex' });

const rules = ref((profile.value?.rules ?? []).map((r) => ({ ...r })));
const saving = ref(false);
async function saveRules() {
  const parsed = onboardingScheduleSchema.safeParse({ rules: rules.value });
  if (!parsed.success) return toast.error(t('validation.end_before_start'));
  saving.value = true;
  try {
    await save('/schedule', parsed.data);
    toast.success(t('settings.saved'));
  } catch (e) {
    toast.error(errMsg(e));
  } finally {
    saving.value = false;
  }
}

const today = utcToZonedDate(new Date());
const exc = reactive({ date: today, available: false, allDay: true, start: '09:00', end: '13:00', note: '' });
const fe = useFieldErrors();
async function addException() {
  fe.clear();
  const body = {
    date: exc.date,
    available: exc.available,
    startMinute: exc.allDay ? null : timeToMinutes(exc.start),
    endMinute: exc.allDay ? null : timeToMinutes(exc.end),
    note: exc.note,
  };
  const parsed = availabilityExceptionSchema.safeParse(body);
  if (!parsed.success) return fe.fromZod(parsed.error.issues);
  try {
    await save('/exceptions', parsed.data, 'POST');
    exc.note = '';
    toast.success(t('settings.saved'));
  } catch (e) {
    fe.set(e);
    toast.error(errMsg(e));
  }
}
async function removeException(id: string) {
  await save(`/exceptions/${id}`, null, 'DELETE').catch((e) => toast.error(errMsg(e)));
}
</script>

<template>
  <div class="max-w-3xl space-y-6">
    <AppPageHeader :title="t('pro.nav.availability')" :subtitle="t('availability.subtitle')" />
    <UiEmptyState v-if="!profile" :title="t('pro.noProfile')"><UiButton :to="localePath('/become-a-professional')">{{ t('nav.becomePro') }}</UiButton></UiEmptyState>
    <template v-else>
      <UiCard>
        <h2 class="text-lg font-semibold">{{ t('availability.weekly') }}</h2>
        <p class="mb-4 mt-1 text-sm text-muted">{{ t('availability.weeklyHelp') }}</p>
        <AppWeeklyScheduleEditor v-model="rules" />
        <UiButton class="mt-4" :loading="saving" @click="saveRules">{{ t('common.save') }}</UiButton>
      </UiCard>

      <UiCard>
        <h2 class="text-lg font-semibold">{{ t('availability.exceptions') }}</h2>
        <p class="mt-1 text-sm text-muted">{{ t('availability.exceptionsHelp') }}</p>
        <form class="mt-4 grid gap-4 sm:grid-cols-2" novalidate @submit.prevent="addException">
          <UiDateField v-model="exc.date" :label="t('availability.date')" :min="today" :error="fe.errors.value.date" />
          <UiSelect
            :model-value="exc.available ? 'yes' : 'no'"
            :label="t('availability.kind')"
            :options="[
              { value: 'no', label: t('profile.unavailable') },
              { value: 'yes', label: t('profile.extraHours') },
            ]"
            @update:model-value="(v) => (exc.available = v === 'yes')"
          />
          <UiCheckbox v-model="exc.allDay" :label="t('availability.allDay')" class="sm:col-span-2" />
          <template v-if="!exc.allDay">
            <UiDateField v-model="exc.start" type="time" :label="t('schedule.from')" />
            <UiDateField v-model="exc.end" type="time" :label="t('schedule.to')" :error="fe.errors.value.endMinute" />
          </template>
          <UiInput v-model="exc.note" :label="t('availability.note')" :help="t('availability.noteHelp')" maxlength="200" class="sm:col-span-2" />
          <div class="sm:col-span-2"><UiButton type="submit" variant="secondary">{{ t('availability.addException') }}</UiButton></div>
        </form>
        <ul v-if="profile.exceptions.length" class="mt-6 divide-y divide-line border-t border-line">
          <li v-for="e in profile.exceptions" :key="e.id" class="flex items-center gap-3 py-3">
            <div class="min-w-0 flex-1">
              <p class="font-medium">{{ ymd(e.date, { weekday: 'short', day: 'numeric', month: 'long' }) }}</p>
              <p class="text-sm" :class="e.available ? 'text-success' : 'text-danger'">
                {{ e.available ? t('profile.extraHours') : t('profile.unavailable') }}
                <span v-if="e.startMinute != null" class="text-muted">· {{ minutes(e.startMinute) }}–{{ minutes(e.endMinute ?? 1440) }}</span>
                <span v-if="e.note" class="text-muted">· {{ e.note }}</span>
              </p>
            </div>
            <button type="button" class="inline-flex size-10 items-center justify-center rounded-lg text-muted hover:bg-bg hover:text-danger" :aria-label="t('common.delete')" @click="removeException(e.id)"><Trash2 class="size-4" /></button>
          </li>
        </ul>
      </UiCard>
    </template>
  </div>
</template>
