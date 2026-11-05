<script setup lang="ts">
definePageMeta({ layout: 'dashboard', section: 'pro', middleware: 'auth' });
const { t } = useI18n();
useSeoMeta({ title: () => t('onboarding.title'), robots: 'noindex' });
</script>

<template>
  <div>
    <AppPageHeader :title="t('onboarding.title')" :subtitle="t('onboarding.subtitle')" />
    <AppOnboardingWizard mode="onboarding" />
  </div>
</template>
