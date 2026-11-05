<script setup lang="ts">
const props = defineProps<{ translations: { locale: string; name: string }[] }>();
const { t } = useI18n();
const missing = computed(() => (['hy', 'ru', 'en'] as const).filter((l) => !props.translations.find((x) => x.locale === l && x.name)));
</script>

<template>
  <UiBadge v-if="!missing.length" tone="success">3/3</UiBadge>
  <UiBadge v-else tone="warning" :title="t('admin.tx.missing', { list: missing.join(', ') })">{{ 3 - missing.length }}/3 · {{ missing.join(', ').toUpperCase() }}</UiBadge>
</template>
