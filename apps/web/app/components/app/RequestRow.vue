<script setup lang="ts">
import { CalendarDays, MapPin, Repeat } from 'lucide-vue-next';
import type { RequestSummaryDto } from '@carely/shared';
const props = defineProps<{ r: RequestSummaryDto }>();
const { t } = useI18n();
const { tx, range, ymd, minutes, weekday, relative } = useFormat();
const localePath = useLocalePath();
</script>

<template>
  <li>
    <NuxtLink :to="localePath(`/requests/${r.id}`)" class="card flex flex-col gap-3 p-4 transition-shadow hover:shadow-[var(--shadow-card)] sm:flex-row sm:items-center">
      <UiAvatar :src="r.counterpart.portraitUrl" :name="r.counterpart.name" :size="48" />
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <p class="font-semibold">{{ r.counterpart.name }}</p>
          <AppStatusBadge :status="r.status" />
        </div>
        <p class="text-[0.9375rem] text-[#475467]">{{ tx(r.service) }}</p>
        <ul class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <li v-if="!r.recurrence" class="inline-flex items-center gap-1.5"><CalendarDays class="size-4" aria-hidden="true" />{{ range(r.startAt, r.endAt) }}</li>
          <li v-else class="inline-flex items-center gap-1.5">
            <Repeat class="size-4" aria-hidden="true" />{{ ymd(r.recurrence.startDate, { day: 'numeric', month: 'short' }) }} – {{ ymd(r.recurrence.endDate, { day: 'numeric', month: 'short' }) }} ·
            {{ r.recurrence.weekdays.map((d) => weekday(d)).join(', ') }} · {{ minutes(r.recurrence.startMinute) }}–{{ minutes(r.recurrence.endMinute) }}
          </li>
          <li class="inline-flex items-center gap-1.5"><MapPin class="size-4" aria-hidden="true" />{{ tx(r.location) }}</li>
        </ul>
      </div>
      <p v-if="r.status === 'ACCEPTED' && r.expiresAt" class="text-sm font-medium text-warning sm:text-right"><ClientOnly>{{ t('request.expires', { when: relative(r.expiresAt) }) }}</ClientOnly></p>
    </NuxtLink>
  </li>
</template>
