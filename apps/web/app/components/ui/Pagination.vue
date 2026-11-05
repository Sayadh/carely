<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
const props = defineProps<{ page: number; pageCount: number }>();
const emit = defineEmits<{ change: [page: number] }>();
const { t } = useI18n();
const pages = computed(() => {
  const out: (number | '…')[] = [];
  for (let p = 1; p <= props.pageCount; p++) {
    if (p === 1 || p === props.pageCount || Math.abs(p - props.page) <= 1) out.push(p);
    else if (out[out.length - 1] !== '…') out.push('…');
  }
  return out;
});
</script>

<template>
  <nav v-if="pageCount > 1" :aria-label="t('common.pagination')" class="flex items-center justify-center gap-1">
    <button type="button" class="inline-flex size-10 items-center justify-center rounded-lg hover:bg-surface disabled:opacity-40" :disabled="page <= 1" :aria-label="t('common.prevPage')" @click="emit('change', page - 1)">
      <ChevronLeft class="size-5" />
    </button>
    <template v-for="(p, i) in pages" :key="i">
      <span v-if="p === '…'" class="px-2 text-muted">…</span>
      <button
        v-else
        type="button"
        class="inline-flex size-10 items-center justify-center rounded-lg text-[0.9375rem]"
        :class="p === page ? 'bg-primary text-white' : 'hover:bg-surface'"
        :aria-current="p === page ? 'page' : undefined"
        @click="emit('change', p)"
      >
        {{ p }}
      </button>
    </template>
    <button type="button" class="inline-flex size-10 items-center justify-center rounded-lg hover:bg-surface disabled:opacity-40" :disabled="page >= pageCount" :aria-label="t('common.nextPage')" @click="emit('change', page + 1)">
      <ChevronRight class="size-5" />
    </button>
  </nav>
</template>
