<script setup lang="ts">
import { X } from 'lucide-vue-next';
/** Native <dialog> modal: built-in focus trapping, Esc to close and inert background. */
const open = defineModel<boolean>('open', { default: false });
const props = withDefaults(defineProps<{ title: string; description?: string; size?: 'sm' | 'md' | 'lg'; variant?: 'center' | 'drawer' }>(), { size: 'md', variant: 'center' });
const el = ref<HTMLDialogElement | null>(null);
const { t } = useI18n();
const titleId = useId();

watch(
  open,
  (v) => {
    if (!el.value) return;
    if (v && !el.value.open) el.value.showModal();
    if (!v && el.value.open) el.value.close();
  },
  { flush: 'post' },
);
onMounted(() => {
  if (open.value) el.value?.showModal();
});
function onBackdrop(e: MouseEvent) {
  if (e.target === el.value) open.value = false;
}
</script>

<template>
  <dialog
    ref="el"
    :aria-labelledby="titleId"
    class="carely-dialog m-0 max-h-none max-w-none bg-transparent p-0 backdrop:bg-[rgb(16_24_40/0.45)]"
    :class="props.variant === 'drawer' ? 'drawer' : 'center'"
    @close="open = false"
    @click="onBackdrop"
  >
    <div
      class="flex max-h-[100dvh] flex-col bg-surface shadow-[var(--shadow-pop)]"
      :class="
        props.variant === 'drawer'
          ? 'fixed inset-x-0 bottom-0 max-h-[90dvh] rounded-t-[18px] md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[420px] md:rounded-none'
          : ['fixed left-1/2 top-1/2 w-[calc(100%-32px)] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-panel)]', { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }[props.size]]
      "
    >
      <header class="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <h2 :id="titleId" class="text-lg font-semibold">{{ title }}</h2>
          <p v-if="description" class="mt-1 text-sm text-muted">{{ description }}</p>
        </div>
        <button type="button" class="-m-2 rounded-lg p-2 text-muted hover:bg-bg hover:text-ink" :aria-label="t('common.close')" @click="open = false">
          <X class="size-5" aria-hidden="true" />
        </button>
      </header>
      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-5"><slot /></div>
      <footer v-if="$slots.footer" class="flex flex-wrap justify-end gap-3 border-t border-line px-5 py-4"><slot name="footer" /></footer>
    </div>
  </dialog>
</template>

<style scoped>
.carely-dialog[open] > div {
  animation: pop 0.16s ease-out;
}
@keyframes pop {
  from {
    opacity: 0;
    transform: translate(-50%, calc(-50% + 8px));
  }
}
.carely-dialog.drawer[open] > div {
  animation: slide 0.2s ease-out;
}
@keyframes slide {
  from {
    transform: translateY(24px);
    opacity: 0;
  }
}
</style>
