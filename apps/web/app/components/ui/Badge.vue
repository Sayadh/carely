<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'peach' }>(), { tone: 'neutral' });
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium leading-5 whitespace-nowrap"
    :class="{
      neutral: 'bg-[#f2f4f7] text-[#344054]',
      primary: 'bg-primary-soft text-primary',
      success: 'bg-success-soft text-success',
      warning: 'bg-warning-soft text-warning',
      danger: 'bg-danger-soft text-danger',
      info: 'bg-info-soft text-info',
      peach: 'bg-peach-soft text-[#9a4a2a]',
    }[tone]"
  >
    <slot />
  </span>
</template>
