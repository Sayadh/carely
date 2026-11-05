<script setup lang="ts">
import { Star } from 'lucide-vue-next';
/** Displays the API-computed rating (never recalculated on the client). */
defineProps<{ rating: number | null; ratingCount: number; totalReviewCount: number }>();
const { t } = useI18n();
</script>

<template>
  <span v-if="rating == null" class="text-sm text-muted">{{ t('rating.none') }}</span>
  <span v-else class="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
    <Star class="size-4 fill-[#f5b546] text-[#f5b546]" aria-hidden="true" />
    <span class="font-medium" :aria-label="t('rating.valueLabel', { v: rating.toFixed(2) })">{{ rating.toFixed(2) }}</span>
    <span class="text-muted">({{ t('card.reviews', totalReviewCount) }})</span>
    <UiBadge v-if="ratingCount >= 1 && ratingCount <= 4" tone="neutral">{{ t('rating.preliminary') }}</UiBadge>
  </span>
</template>
