<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next';
defineProps<{ items: { q: string; a: string }[] }>();
</script>

<template>
  <div class="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
    <details v-for="(it, i) in items" :key="i" class="group px-5 py-1 [&_summary::-webkit-details-marker]:hidden">
      <summary class="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-medium">
        {{ it.q }}
        <ChevronDown class="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <p class="pb-4 text-[#475467]">{{ it.a }}</p>
    </details>
  </div>
</template>
