<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next';
import { minutesToTime, timeToMinutes } from '@carely/shared';
type Rule = { weekday: number; startMinute: number; endMinute: number };
const model = defineModel<Rule[]>({ required: true });
const { t } = useI18n();
const { weekday } = useFormat();

const toTime = (m: number) => (m >= 1440 ? '23:59' : minutesToTime(m));
const fromTime = (s: string) => (s === '23:59' ? 1440 : timeToMinutes(s));
const byDay = computed(() => [1, 2, 3, 4, 5, 6, 7].map((d) => ({ d, rules: model.value.map((r, i) => ({ ...r, i })).filter((r) => r.weekday === d) })));
function add(d: number) {
  const last = model.value.filter((r) => r.weekday === d).sort((a, b) => b.endMinute - a.endMinute)[0];
  const start = last ? Math.min(last.endMinute + 60, 1380) : 540;
  model.value = [...model.value, { weekday: d, startMinute: start, endMinute: Math.min(start + 240, 1440) }];
}
function remove(i: number) {
  model.value = model.value.filter((_, j) => j !== i);
}
function update(i: number, key: 'startMinute' | 'endMinute', value: string) {
  if (!value) return;
  model.value = model.value.map((r, j) => (j === i ? { ...r, [key]: fromTime(value) } : r));
}
function copyToWeekdays() {
  const mon = model.value.filter((r) => r.weekday === 1);
  model.value = [...model.value.filter((r) => r.weekday > 5), ...[1, 2, 3, 4, 5].flatMap((d) => mon.map((r) => ({ ...r, weekday: d })))];
}
const invalid = (r: Rule) => r.endMinute <= r.startMinute;
</script>

<template>
  <div>
    <ul class="divide-y divide-line rounded-[var(--radius-card)] border border-line">
      <li v-for="day in byDay" :key="day.d" class="flex flex-col gap-2 p-3 sm:flex-row sm:items-start">
        <p class="w-32 shrink-0 pt-2.5 font-medium">{{ weekday(day.d, 'long') }}</p>
        <div class="flex-1 space-y-2">
          <p v-if="!day.rules.length" class="pt-2.5 text-[0.9375rem] text-muted">{{ t('schedule.unavailable') }}</p>
          <div v-for="r in day.rules" :key="r.i" class="flex flex-wrap items-center gap-2">
            <input type="time" step="900" class="control !w-32" :value="toTime(r.startMinute)" :aria-label="`${weekday(day.d, 'long')} — ${t('schedule.from')}`" @change="update(r.i, 'startMinute', ($event.target as HTMLInputElement).value)" />
            <span class="text-muted">–</span>
            <input type="time" step="900" class="control !w-32" :value="toTime(r.endMinute)" :aria-invalid="invalid(r) || undefined" :aria-label="`${weekday(day.d, 'long')} — ${t('schedule.to')}`" @change="update(r.i, 'endMinute', ($event.target as HTMLInputElement).value)" />
            <button type="button" class="inline-flex size-10 items-center justify-center rounded-lg text-muted hover:bg-bg hover:text-danger" :aria-label="t('schedule.removeSlot')" @click="remove(r.i)"><Trash2 class="size-4" /></button>
            <p v-if="invalid(r)" class="w-full text-sm text-danger">{{ t('validation.end_before_start') }}</p>
          </div>
        </div>
        <UiButton variant="ghost" size="sm" class="self-start" @click="add(day.d)"><Plus class="size-4" aria-hidden="true" />{{ t('schedule.addSlot') }}</UiButton>
      </li>
    </ul>
    <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
      <p class="text-sm text-muted">{{ t('schedule.help') }}</p>
      <UiButton variant="secondary" size="sm" :disabled="!model.some((r) => r.weekday === 1)" @click="copyToWeekdays">{{ t('schedule.copyMonday') }}</UiButton>
    </div>
  </div>
</template>
