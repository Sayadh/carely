<script setup lang="ts">
const { t } = useI18n();
useSeoMeta({ title: () => t('aboutPage.title'), description: () => t('aboutPage.lead') });
</script>

<template>
  <AppContentPage :title="t('aboutPage.title')" :lead="t('aboutPage.lead')" narrow>
    <div class="prose-care space-y-4 text-[#344054]">
      <p>{{ t('aboutPage.p1') }}</p>
      <p>{{ t('aboutPage.p2') }}</p>
      <p>{{ t('aboutPage.p3') }}</p>
      <p>{{ t('aboutPage.p4') }}</p>
    </div>
  </AppContentPage>
</template>
