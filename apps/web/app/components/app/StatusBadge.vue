<script setup lang="ts">
import type { RequestStatus } from '@carely/shared';
const props = defineProps<{ status: RequestStatus }>();
const { t } = useI18n();
const tone = computed(
  () =>
    ({ SUBMITTED: 'info', ACCEPTED: 'warning', CONFIRMED: 'success', COMPLETED: 'primary', DECLINED: 'neutral', CANCELLED: 'neutral', EXPIRED: 'neutral' })[props.status] as any,
);
</script>

<template>
  <UiBadge :tone="tone">{{ t(`requestStatus.${status}`) }}</UiBadge>
</template>
