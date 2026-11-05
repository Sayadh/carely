<script setup lang="ts">
import { Phone, UserRound } from 'lucide-vue-next';
import { LEAD_STATUSES, type LeadAdminDto, type LeadStatus, type Paginated } from '@carely/shared';
definePageMeta({ layout: 'admin', middleware: 'admin' });

/** Requests for the Carely team: call the client, find a professional, introduce both sides. */
const { t } = useI18n();
const api = useApi();
const route = useRoute();
const router = useRouter();
const localePath = useLocalePath();
const { tx, date, dateTime } = useFormat();
useSeoMeta({ title: () => t('admin.nav.leads'), robots: 'noindex' });

const q = ref(typeof route.query.q === 'string' ? route.query.q : '');
const status = computed({
  get: () => (typeof route.query.status === 'string' ? route.query.status : 'ALL'),
  set: (v) => router.replace({ query: { ...route.query, status: v === 'ALL' ? undefined : v, page: undefined } }),
});
const page = computed(() => Number(route.query.page) || 1);
const { data } = await useAsyncData(
  () => `admin:leads:${JSON.stringify(route.query)}`,
  () => api<Paginated<LeadAdminDto> & { newCount: number }>('/admin/leads', { query: { status: status.value === 'ALL' ? undefined : status.value, q: route.query.q, page: page.value } }),
  { watch: [() => route.query] },
);
const tabs = computed(() => ['ALL', ...LEAD_STATUSES].map((s) => ({ value: s, label: s === 'ALL' ? t('common.all') : t(`leadStatus.${s}`), count: s === 'NEW' ? data.value?.newCount : undefined })));
</script>

<template>
  <div>
    <AppPageHeader :title="t('admin.nav.leads')" :subtitle="t('admin.leads.subtitle')" />
    <form class="mb-4 flex max-w-md gap-2" role="search" @submit.prevent="router.replace({ query: { ...route.query, q: q || undefined, page: undefined } })">
      <UiInput v-model="q" :label="t('common.search')" :placeholder="t('admin.leads.search')" class="flex-1 [&_.field-label]:sr-only" />
      <UiButton type="submit" variant="secondary">{{ t('common.search') }}</UiButton>
    </form>
    <UiTabs v-model="status" :tabs="tabs" :label="t('admin.filterStatus')" />
    <ul class="mt-4 space-y-3">
      <li v-for="l in data?.items ?? []" :key="l.id">
        <NuxtLink :to="localePath(`/admin/leads/${l.id}`)" class="card block p-4 transition-shadow hover:shadow-[var(--shadow-card)]">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="font-medium">{{ l.name }} <span class="ml-1 inline-flex items-center gap-1 text-[0.9375rem] font-normal text-[#475467]"><Phone class="size-3.5" aria-hidden="true" />{{ l.phone }}</span></p>
            <AppLeadStatusBadge :status="l.status as LeadStatus" />
          </div>
          <p class="mt-1 text-[0.9375rem] text-[#344054]">
            <template v-if="l.requestedProfessional"><UserRound class="mr-1 inline size-4 align-[-0.15em] text-muted" aria-hidden="true" />{{ l.requestedProfessional.displayName }} · </template>
            <template v-else>{{ t('leadSource.GENERAL') }} · </template>
            {{ [tx(l.service ?? l.category ?? {}), tx(l.location ?? {})].filter(Boolean).join(' · ') || '—' }}
          </p>
          <p v-if="l.startDate || l.endDate || l.schedule" class="mt-0.5 truncate text-sm text-muted">
            <template v-if="l.startDate || l.endDate">{{ l.startDate ? date(l.startDate) : '…' }} – {{ l.endDate ? date(l.endDate) : t('lead.openEnded') }}</template><template v-if="(l.startDate || l.endDate) && l.schedule"> · </template>{{ l.schedule }}
          </p>
          <p class="mt-1 text-xs text-muted">{{ dateTime(l.createdAt) }}<template v-if="l.handledBy"> · {{ t('admin.leads.handledBy', { name: l.handledBy }) }}</template></p>
        </NuxtLink>
      </li>
      <li v-if="!data?.items.length"><UiEmptyState :title="t('admin.leads.empty')" /></li>
    </ul>
    <UiPagination v-if="data" class="mt-6" :page="data.page" :page-count="data.pageCount" @change="(p) => router.replace({ query: { ...route.query, page: p } })" />
  </div>
</template>
