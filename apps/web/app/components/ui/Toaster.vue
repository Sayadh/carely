<script setup lang="ts">
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-vue-next';
const { items, dismiss } = useToast();
const { t } = useI18n();
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 bottom-[84px] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-24 md:items-end md:px-6" aria-live="polite" role="status">
    <TransitionGroup name="toast">
      <div
        v-for="item in items"
        :key="item.id"
        class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-pop)]"
      >
        <CheckCircle2 v-if="item.kind === 'success'" class="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
        <AlertCircle v-else-if="item.kind === 'error'" class="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
        <Info v-else class="mt-0.5 size-5 shrink-0 text-info" aria-hidden="true" />
        <p class="flex-1 text-[0.9375rem]">{{ item.message }}</p>
        <button type="button" class="-m-1 rounded p-1 text-muted hover:text-ink" :aria-label="t('common.close')" @click="dismiss(item.id)"><X class="size-4" /></button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
