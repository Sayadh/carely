<script setup lang="ts">
/** Bottom sheet on mobile, side panel on desktop. */
const open = defineModel<boolean>('open', { default: false });
defineProps<{ title: string; description?: string }>();
</script>

<template>
  <UiDialog v-model:open="open" :title="title" :description="description" variant="drawer">
    <slot />
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </UiDialog>
</template>
