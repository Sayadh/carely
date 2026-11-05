<script setup lang="ts">
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-vue-next';
const props = withDefaults(defineProps<{ tone?: 'info' | 'success' | 'warning' | 'danger'; title?: string }>(), { tone: 'info' });
const icon = computed(() => ({ info: Info, success: CheckCircle2, warning: TriangleAlert, danger: AlertCircle })[props.tone]);
</script>

<template>
  <div
    class="flex gap-3 rounded-[var(--radius-card)] border p-4 text-[0.9375rem]"
    :class="{
      info: 'border-[#b2ddff] bg-info-soft',
      success: 'border-[#abefc6] bg-success-soft',
      warning: 'border-[#fedf89] bg-warning-soft',
      danger: 'border-[#fecdca] bg-danger-soft',
    }[tone]"
    :role="tone === 'danger' ? 'alert' : 'status'"
  >
    <component :is="icon" class="mt-0.5 size-5 shrink-0" :class="{ info: 'text-info', success: 'text-success', warning: 'text-warning', danger: 'text-danger' }[tone]" aria-hidden="true" />
    <div class="min-w-0">
      <p v-if="title" class="font-semibold">{{ title }}</p>
      <div :class="title ? 'mt-1 text-[#344054]' : ''"><slot /></div>
    </div>
  </div>
</template>
