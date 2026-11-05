<script setup lang="ts">
definePageMeta({ layout: 'dashboard', section: 'pro', middleware: 'auth' });
const { t } = useI18n();
const { profile, load } = useProProfile();
const localePath = useLocalePath();
await load();
useSeoMeta({ title: () => t('pro.nav.verification'), robots: 'noindex' });
</script>

<template>
  <div class="max-w-3xl">
    <AppPageHeader :title="t('pro.nav.verification')" :subtitle="t('verificationPage.subtitle')" />
    <UiEmptyState v-if="!profile" :title="t('pro.noProfile')"><UiButton :to="localePath('/become-a-professional')">{{ t('nav.becomePro') }}</UiButton></UiEmptyState>
    <AppQualificationsEditor v-else :items="profile.qualifications" />
  </div>
</template>
