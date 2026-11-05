<script setup lang="ts">
/** Edits platform-managed labels in all three languages; Armenian is required. */
const model = defineModel<Record<'hy' | 'ru' | 'en', { name: string; description: string }>>({ required: true });
defineProps<{ withDescription?: boolean }>();
const { t } = useI18n();
const names = { hy: 'Հայերեն', ru: 'Русский', en: 'English' } as const;
</script>

<template>
  <div class="space-y-4">
    <fieldset v-for="l in (['hy', 'ru', 'en'] as const)" :key="l" class="rounded-[var(--radius-control)] border border-line p-3">
      <legend class="px-1 text-sm font-medium">{{ names[l] }}<span v-if="l === 'hy'" class="text-danger"> *</span></legend>
      <UiInput v-model="model[l].name" :label="t('admin.tx.name')" :lang="l" :required="l === 'hy'" />
      <UiTextarea v-if="withDescription" v-model="model[l].description" :label="t('admin.tx.description')" :rows="2" :lang="l" class="mt-3" />
    </fieldset>
  </div>
</template>
