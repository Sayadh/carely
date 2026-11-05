<script setup lang="ts">
defineProps<{ class?: string }>();
</script>

<template>
  <div class="animate-pulse rounded-lg bg-[#eaecf0]" :class="$props.class" aria-hidden="true" />
</template>
