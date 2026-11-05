<script setup lang="ts">
import { MapPin, BriefcaseBusiness, Languages, CalendarDays } from 'lucide-vue-next';
import type { ProfessionalCardDto } from '@carely/shared';
const props = defineProps<{ pro: ProfessionalCardDto; headingLevel?: 'h2' | 'h3' }>();
const { t, locale } = useI18n();
const { tx, price, weekday } = useFormat();
const localePath = useLocalePath();
const to = computed(() => localePath(`/professionals/${props.pro.slug}`));
const areas = computed(() => {
  const names = props.pro.serviceAreas.map((a) => tx(a.name));
  return names.length > 2 ? `${names.slice(0, 2).join(', ')} ${t('card.moreAreas', { n: names.length - 2 })}` : names.join(', ');
});
const days = computed(() => (props.pro.weeklyDays.length === 7 ? t('card.everyDay') : props.pro.weeklyDays.map((d) => weekday(d)).join(', ')));
</script>

<template>
  <article class="card group relative flex flex-col gap-4 p-4 transition-shadow hover:shadow-[var(--shadow-card)] sm:flex-row sm:p-5">
    <NuxtLink :to="to" class="shrink-0 self-start" tabindex="-1" aria-hidden="true">
      <span class="hidden sm:block"><UiAvatar :src="pro.portraitUrl" :name="pro.displayName" :size="104" /></span>
      <span class="sm:hidden"><UiAvatar :src="pro.portraitUrl" :name="pro.displayName" :size="72" /></span>
    </NuxtLink>
    <div class="min-w-0 flex-1">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <component :is="headingLevel ?? 'h2'" class="text-lg font-semibold leading-snug">
            <NuxtLink :to="to" class="after:absolute after:inset-0 after:content-[''] hover:text-primary focus-visible:outline-none">{{ pro.displayName }}</NuxtLink>
          </component>
          <p class="mt-0.5 text-[0.9375rem] text-[#475467]" :lang="pro.headlineLocale !== locale ? pro.headlineLocale : undefined">{{ pro.headline }}</p>
        </div>
        <div class="relative z-10 shrink-0"><AppFavoriteButton :profile-id="pro.id" :name="pro.displayName" /></div>
      </div>
      <ul class="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted">
        <li class="inline-flex items-center gap-1.5"><BriefcaseBusiness class="size-4" aria-hidden="true" />{{ tx(pro.category) }} · {{ t('card.experience', pro.experienceYears) }}</li>
        <li class="inline-flex items-center gap-1.5"><MapPin class="size-4" aria-hidden="true" /><span class="sr-only">{{ t('card.serviceArea') }}:</span>{{ areas }}</li>
        <li class="inline-flex items-center gap-1.5"><Languages class="size-4" aria-hidden="true" /><span class="sr-only">{{ t('card.languages') }}:</span>{{ pro.languages.map((l) => t(`lang.${l}`)).join(', ') }}</li>
        <li v-if="pro.weeklyDays.length" class="inline-flex items-center gap-1.5"><CalendarDays class="size-4" aria-hidden="true" /><span class="sr-only">{{ t('card.usualDays') }}:</span>{{ days }}</li>
      </ul>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <AppVerificationBadges :items="pro.verifications" :max="3" />
        <AppRatingSummary :rating="pro.rating" :rating-count="pro.ratingCount" :total-review-count="pro.totalReviewCount" />
        <UiBadge v-if="pro.isDemo" tone="peach">{{ t('demo.label') }}</UiBadge>
      </div>
    </div>
    <div class="flex items-center justify-between gap-3 border-t border-line pt-3 sm:w-44 sm:flex-col sm:items-end sm:justify-between sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
      <p class="text-right">
        <span class="block text-xs text-muted">{{ t('card.from') }}</span>
        <span class="font-semibold">{{ price(pro.price) }}</span>
      </p>
      <!-- Real link (sits above the card's stretched link); hidden from AT/tab order because the name link already covers the card. -->
      <NuxtLink
        :to="to"
        tabindex="-1"
        aria-hidden="true"
        class="relative z-10 inline-flex min-h-10 items-center rounded-[var(--radius-control)] border border-line-strong px-3 text-sm font-medium text-ink group-hover:border-primary group-hover:text-primary"
      >
        {{ t('card.viewProfile') }}
      </NuxtLink>
    </div>
  </article>
</template>
