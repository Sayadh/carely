<script setup lang="ts">
import type { Paginated } from '@carely/shared';
import { REQUEST_STATUSES } from '@carely/shared';
definePageMeta({ layout: 'admin', middleware: 'admin' });
const { t } = useI18n();
const api = useApi();
const route = useRoute();
const router = useRouter();
const localePath = useLocalePath();
const { tx, dateTime } = useFormat();
useSeoMeta({ title: () => t('admin.nav.requests'), robots: 'noindex' });
const q = ref(typeof route.query.q === 'string' ? route.query.q : '');
const status = computed({ get: () => (typeof route.query.status === 'string' ? route.query.status : 'ALL'), set: (v) => router.replace({ query: { ...route.query, status: v === 'ALL' ? undefined : v, page: undefined } }) });
const page = computed(() => Number(route.query.page) || 1);
const { data } = await useAsyncData(() => `admin:req:${JSON.stringify(route.query)}`, () => api<Paginated<any>>('/admin/requests', { query: { status: status.value === 'ALL' ? undefined : status.value, q: route.query.q, page: page.value } }), { watch: [() => route.query] });
const tabs = computed(() => ['ALL', ...REQUEST_STATUSES].map((s) => ({ value: s, label: s === 'ALL' ? t('common.all') : t(`requestStatus.${s}`) })));
</script>

<template>
  <div>
    <AppPageHeader :title="t('admin.nav.requests')" />
    <form class="mb-4 flex max-w-md gap-2" role="search" @submit.prevent="router.replace({ query: { ...route.query, q: q || undefined, page: undefined } })">
      <UiInput v-model="q" :label="t('common.search')" :placeholder="t('admin.searchRequests')" class="flex-1 [&_.field-label]:sr-only" />
      <UiButton type="submit" variant="secondary">{{ t('common.search') }}</UiButton>
    </form>
    <UiTabs v-model="status" :tabs="tabs" :label="t('admin.filterStatus')" />
    <div class="card mt-4 overflow-x-auto">
      <table class="w-full min-w-[720px] text-left text-[0.9375rem]">
        <thead class="border-b border-line text-sm text-muted"><tr><th class="px-4 py-3 font-medium">{{ t('request.service') }}</th><th class="px-4 py-3 font-medium">{{ t('request.role.customer') }}</th><th class="px-4 py-3 font-medium">{{ t('request.role.professional') }}</th><th class="px-4 py-3 font-medium">{{ t('request.when') }}</th><th class="px-4 py-3 font-medium">{{ t('admin.col.status') }}</th></tr></thead>
        <tbody>
          <tr v-for="r in data?.items ?? []" :key="r.id" class="border-b border-line last:border-0 hover:bg-bg">
            <td class="px-4 py-3"><NuxtLink :to="localePath(`/admin/requests/${r.id}`)" class="font-medium text-primary hover:underline">{{ tx(r.service) }}</NuxtLink><p class="font-mono text-xs text-muted">{{ r.id }}</p></td>
            <td class="px-4 py-3">{{ r.customer.name }}<p class="text-sm text-muted">{{ r.customer.email }}</p></td>
            <td class="px-4 py-3">{{ r.professional.displayName }}</td>
            <td class="px-4 py-3 text-sm">{{ dateTime(r.startAt) }}</td>
            <td class="px-4 py-3"><AppStatusBadge :status="r.status" /></td>
          </tr>
        </tbody>
      </table>
    </div>
    <UiPagination v-if="data" class="mt-6" :page="data.page" :page-count="data.pageCount" @change="(p) => router.replace({ query: { ...route.query, page: p } })" />
  </div>
</template>
