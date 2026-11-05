<script setup lang="ts">
import type { NuxtError } from '#app';
const props = defineProps<{ error: NuxtError }>();
const { t } = useI18n();
const localePath = useLocalePath();
const is404 = computed(() => props.error.statusCode === 404);
useSeoMeta({ title: () => (is404.value ? t('errorPage.notFoundTitle') : t('errorPage.title')), robots: 'noindex' });
</script>

<template>
  <NuxtLayout name="default">
    <div class="container-page flex flex-col items-center py-24 text-center">
      <p class="text-sm font-semibold text-primary">{{ error.statusCode }}</p>
      <h1 class="mt-2 text-3xl font-semibold">{{ is404 ? t('errorPage.notFoundTitle') : t('errorPage.title') }}</h1>
      <p class="mt-3 max-w-md text-muted">{{ is404 ? t('errorPage.notFoundText') : t('errorPage.text') }}</p>
      <div class="mt-8 flex gap-3">
        <UiButton @click="clearError({ redirect: localePath('/') })">{{ t('errorPage.home') }}</UiButton>
        <UiButton variant="secondary" @click="clearError({ redirect: localePath('/professionals') })">{{ t('nav.professionals') }}</UiButton>
      </div>
    </div>
  </NuxtLayout>
</template>
