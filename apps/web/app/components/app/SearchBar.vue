<script setup lang="ts">
import { Search } from 'lucide-vue-next';
const props = defineProps<{ category?: string; location?: string; compact?: boolean }>();
const emit = defineEmits<{ search: [q: { category?: string; location?: string }] }>();
const { t } = useI18n();
const { categories, load } = useTaxonomy();
const { tx } = useFormat();
await load().catch(() => undefined);
const category = ref(props.category);
const location = ref(props.location);
watch(() => [props.category, props.location], () => {
  category.value = props.category;
  location.value = props.location;
});
const locationOptions = useLocationOptions();
const categoryOptions = computed(() => (categories.value ?? []).map((c) => ({ value: c.slug, label: tx(c.name) })));
function submit() {
  emit('search', { category: category.value || undefined, location: location.value || undefined });
}
</script>

<template>
  <form role="search" class="card grid gap-3 p-3 md:grid-cols-[1fr_1.25fr_auto] md:items-end md:gap-2 md:p-2.5" :class="compact ? '' : 'shadow-[var(--shadow-card)] md:p-3'" @submit.prevent="submit">
    <UiSelect v-model="category" :label="t('search.service')" :placeholder="t('search.anyService')" :options="categoryOptions" />
    <UiCombobox v-model="location" :label="t('search.location')" :placeholder="t('search.anyLocation')" :options="locationOptions" clearable />
    <UiButton type="submit" size="lg" class="md:min-h-11">
      <Search class="size-5" aria-hidden="true" />
      {{ t('search.submit') }}
    </UiButton>
  </form>
</template>
