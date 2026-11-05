<script setup lang="ts">
const { t, tm, rt } = useI18n();
useSeoMeta({ title: () => t('legal.termsTitle'), robots: 'noindex' });
const sections = computed(() => (tm('legal.terms') as any[]).map((s) => ({ h: rt(s.h), p: rt(s.p) })));
</script>

<template>
  <AppContentPage :title="t('legal.termsTitle')" narrow>
    <UiAlert tone="warning" :title="t('legal.draftTitle')">{{ t('legal.draftText') }}</UiAlert>
    <section v-for="(s, i) in sections" :key="i" class="mt-8"><h2 class="text-lg font-semibold">{{ i + 1 }}. {{ s.h }}</h2><p class="mt-2 text-[#475467]">{{ s.p }}</p></section>
  </AppContentPage>
</template>
