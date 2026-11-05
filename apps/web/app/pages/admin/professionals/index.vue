<script setup lang="ts">
import type { Paginated } from '@carely/shared';
definePageMeta({ layout: 'admin', middleware: 'admin' });
const { t } = useI18n();
const api = useApi();
const route = useRoute();
const router = useRouter();
const localePath = useLocalePath();
const { tx, date } = useFormat();
useSeoMeta({ title: () => t('admin.nav.applications'), robots: 'noindex' });
const status = computed({
  get: () => (typeof route.query.status === 'string' ? route.query.status : 'PENDING'),
  set: (v) => router.replace({ query: { ...route.query, status: v, page: undefined } }),
});
const q = ref(typeof route.query.q === 'string' ? route.query.q : '');
const page = computed(() => Number(route.query.page) || 1);
const { data, pending } = await useAsyncData(
  () => `admin:pros:${status.value}:${route.query.q ?? ''}:${page.value}`,
  () => api<Paginated<any>>('/admin/professionals', { query: { status: status.value === 'ALL' ? undefined : status.value, q: route.query.q, page: page.value } }),
  { watch: [() => route.query] },
);
const tabs = computed(() => ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'DRAFT', 'ALL'].map((s) => ({ value: s, label: s === 'ALL' ? t('common.all') : t(`profileStatus.${s}`) })));
</script>

<template>
  <div>
    <AppPageHeader :title="t('admin.nav.applications')" />
    <form class="mb-4 flex max-w-md gap-2" role="search" @submit.prevent="router.replace({ query: { ...route.query, q: q || undefined, page: undefined } })">
      <UiInput v-model="q" :label="t('common.search')" :placeholder="t('admin.searchPros')" class="flex-1 [&_.field-label]:sr-only" />
      <UiButton type="submit" variant="secondary">{{ t('common.search') }}</UiButton>
    </form>
    <UiTabs v-model="status" :tabs="tabs" :label="t('admin.filterStatus')" />
    <div class="card mt-4 overflow-x-auto">
      <table class="w-full min-w-[640px] text-left text-[0.9375rem]">
        <thead class="border-b border-line text-sm text-muted">
          <tr><th class="px-4 py-3 font-medium">{{ t('admin.col.name') }}</th><th class="px-4 py-3 font-medium">{{ t('admin.col.category') }}</th><th class="px-4 py-3 font-medium">{{ t('admin.col.status') }}</th><th class="px-4 py-3 font-medium">{{ t('admin.col.submitted') }}</th><th class="px-4 py-3 font-medium">{{ t('admin.col.credentials') }}</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in data?.items ?? []" :key="p.id" class="border-b border-line last:border-0 hover:bg-bg">
            <td class="px-4 py-3">
              <NuxtLink :to="localePath(`/admin/professionals/${p.id}`)" class="font-medium text-primary hover:underline">{{ p.displayName || '—' }}</NuxtLink>
              <p class="text-sm text-muted">{{ p.email }}</p>
            </td>
            <td class="px-4 py-3">{{ tx(p.category) || '—' }}</td>
            <td class="px-4 py-3"><UiBadge>{{ t(`profileStatus.${p.status}`) }}</UiBadge> <UiBadge v-if="p.isDemo" tone="peach">{{ t('demo.label') }}</UiBadge></td>
            <td class="px-4 py-3 text-sm">{{ p.submittedAt ? date(p.submittedAt) : '—' }}</td>
            <td class="px-4 py-3 tabular-nums">{{ p.qualificationCount }}</td>
          </tr>
          <tr v-if="!pending && !data?.items.length"><td colspan="5" class="px-4 py-10 text-center text-muted">{{ t('admin.empty') }}</td></tr>
        </tbody>
      </table>
    </div>
    <UiPagination v-if="data" class="mt-6" :page="data.page" :page-count="data.pageCount" @change="(p) => router.replace({ query: { ...route.query, page: p } })" />
  </div>
</template>
