<script setup lang="ts">
const head = useLocaleHead({ dir: false, seo: { canonicalQueries: ['category', 'location'] } } as any);
const { t } = useI18n();
const config = useRuntimeConfig();
useHead(() => ({
  htmlAttrs: { lang: head.value.htmlAttrs?.lang },
  link: [...(head.value.link ?? [])],
  meta: [...(head.value.meta ?? [])],
  titleTemplate: (title?: string) => (title ? `${title} · Carely` : `Carely — ${t('meta.tagline')}`),
}));
useSeoMeta({
  ogSiteName: 'Carely',
  ogType: 'website',
  ogImage: `${config.public.siteUrl}/og.png`,
});
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <UiToaster />
</template>
