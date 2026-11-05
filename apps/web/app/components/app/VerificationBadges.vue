<script setup lang="ts">
import { ShieldCheck, BadgeCheck } from 'lucide-vue-next';
import type { VerificationLabelDto } from '@carely/shared';
/** Shows exactly which checks were completed — never a blanket "safe" claim. */
const props = defineProps<{ items: VerificationLabelDto[]; max?: number }>();
const { t } = useI18n();
const shown = computed(() => (props.max ? props.items.slice(0, props.max) : props.items));
</script>

<template>
  <ul v-if="items.length" class="flex flex-wrap gap-1.5" :aria-label="t('verification.listLabel')">
    <li v-for="v in shown" :key="v.kind + v.title">
      <UiBadge :tone="v.kind === 'IDENTITY' ? 'primary' : 'success'">
        <component :is="v.kind === 'IDENTITY' ? ShieldCheck : BadgeCheck" class="size-3.5" aria-hidden="true" />
        {{ t(`verification.kind.${v.kind}`) }}
      </UiBadge>
    </li>
    <li v-if="max && items.length > max"><UiBadge>+{{ items.length - max }}</UiBadge></li>
  </ul>
</template>
