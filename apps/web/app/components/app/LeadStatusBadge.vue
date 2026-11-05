<script setup lang="ts">
import type { LeadStatus } from '@carely/shared';
const props = defineProps<{ status: LeadStatus }>();
const { t } = useI18n();
const TONES = { NEW: 'warning', IN_PROGRESS: 'info', MATCHED: 'success', CLOSED: 'neutral', CANCELLED: 'neutral' } as const;
const tone = computed(() => TONES[props.status]);
</script>

<template>
  <UiBadge :tone="tone">{{ t(`leadStatus.${status}`) }}</UiBadge>
</template>
