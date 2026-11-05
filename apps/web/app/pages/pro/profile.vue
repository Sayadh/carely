<script setup lang="ts">
definePageMeta({ layout: 'dashboard', section: 'pro', middleware: 'auth' });
const { t } = useI18n();
useSeoMeta({ title: () => t('pro.nav.profile'), robots: 'noindex' });
</script>

<template>
  <div>
    <AppPageHeader :title="t('pro.nav.profile')" :subtitle="t('pro.profileSubtitle')" />
    <AppOnboardingWizard mode="edit" />
  </div>
</template>
