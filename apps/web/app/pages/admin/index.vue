<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });
const { t } = useI18n();
const api = useApi();
const localePath = useLocalePath();
useSeoMeta({ title: () => t('admin.nav.overview'), robots: 'noindex' });
const { data } = await useAsyncData('admin:stats', () => api<Record<string, number>>('/admin/stats'));
const cards = computed(() => [
  { key: 'newLeads', to: '/admin/leads?status=NEW' },
  { key: 'openLeads', to: '/admin/leads' },
  { key: 'pending', to: '/admin/professionals?status=PENDING' },
  { key: 'pendingQualifications', to: '/admin/professionals?status=PENDING' },
  { key: 'pendingReviews', to: '/admin/reviews' },
  { key: 'openInquiries', to: '/admin/inquiries?status=OPEN' },
  { key: 'activeRequests', to: '/admin/requests' },
  { key: 'approved', to: '/admin/professionals?status=APPROVED' },
  { key: 'suspended', to: '/admin/professionals?status=SUSPENDED' },
  { key: 'users', to: '/admin/users' },
]);
</script>

<template>
  <div>
    <AppPageHeader :title="t('admin.nav.overview')" :subtitle="t('admin.overviewSubtitle')" />
    <ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <li v-for="c in cards" :key="c.key">
        <NuxtLink :to="localePath(c.to)" class="card block p-5 hover:shadow-[var(--shadow-card)]">
          <p class="text-sm text-muted">{{ t(`admin.stats.${c.key}`) }}</p>
          <p class="mt-1 text-3xl font-semibold tabular-nums">{{ data?.[c.key] ?? '—' }}</p>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
