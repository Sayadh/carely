<script setup lang="ts">
const { t, tm, rt } = useI18n();
useSeoMeta({ title: () => t('faq.title'), description: () => t('faq.lead') });
const items = computed(() => (tm('faq.items') as any[]).map((i) => ({ q: rt(i.q), a: rt(i.a) })));
</script>

<template>
  <AppContentPage :title="t('faq.title')" :lead="t('faq.lead')" narrow>
    <AppFaq :items="items" />
  </AppContentPage>
</template>
