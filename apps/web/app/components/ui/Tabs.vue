<script setup lang="ts">
/** ARIA tablist with roving focus (arrow keys). Panels are rendered by the parent using the active value. */
const model = defineModel<string>({ required: true });
const props = defineProps<{ tabs: { value: string; label: string; count?: number }[]; label: string }>();
const refs = ref<HTMLButtonElement[]>([]);
function onKey(e: KeyboardEvent, i: number) {
  const n = props.tabs.length;
  let next = -1;
  if (e.key === 'ArrowRight') next = (i + 1) % n;
  if (e.key === 'ArrowLeft') next = (i - 1 + n) % n;
  if (e.key === 'Home') next = 0;
  if (e.key === 'End') next = n - 1;
  if (next >= 0) {
    e.preventDefault();
    model.value = props.tabs[next]!.value;
    refs.value[next]?.focus();
  }
}
</script>

<template>
  <div role="tablist" :aria-label="label" class="-mx-1 flex gap-1 overflow-x-auto border-b border-line px-1">
    <button
      v-for="(tab, i) in tabs"
      :key="tab.value"
      :ref="(el) => (refs[i] = el as HTMLButtonElement)"
      role="tab"
      type="button"
      :aria-selected="model === tab.value"
      :tabindex="model === tab.value ? 0 : -1"
      class="relative -mb-px inline-flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-[0.9375rem] font-medium transition-colors"
      :class="model === tab.value ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink'"
      @click="model = tab.value"
      @keydown="onKey($event, i)"
    >
      {{ tab.label }}
      <span v-if="tab.count != null" class="rounded-full bg-bg px-2 text-xs text-muted">{{ tab.count }}</span>
    </button>
  </div>
</template>
