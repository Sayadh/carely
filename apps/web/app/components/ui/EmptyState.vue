<script setup lang="ts">
import type { Component } from 'vue';
defineProps<{ title: string; text?: string; icon?: Component }>();
</script>

<template>
  <div class="card flex flex-col items-center px-6 py-12 text-center">
    <div v-if="icon" class="mb-4 flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
      <component :is="icon" class="size-6" aria-hidden="true" />
    </div>
    <h2 class="text-lg font-semibold">{{ title }}</h2>
    <p v-if="text" class="mt-2 max-w-md text-muted">{{ text }}</p>
    <div v-if="$slots.default" class="mt-5 flex flex-wrap justify-center gap-3"><slot /></div>
  </div>
</template>
