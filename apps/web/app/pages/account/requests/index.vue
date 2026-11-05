<script setup lang="ts">
definePageMeta({ layout: 'dashboard', section: 'account', middleware: 'auth' });
const { t } = useI18n();
useSeoMeta({ title: () => t('account.nav.requests'), robots: 'noindex' });
</script>

<template>
  <div>
    <AppPageHeader :title="t('account.nav.requests')" :subtitle="t('account.requestsSubtitle')" />
    <AppRequestList as="customer" />
  </div>
</template>
