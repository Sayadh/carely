<script setup lang="ts">
import type { Paginated } from '@carely/shared';
definePageMeta({ layout: 'admin', middleware: 'admin' });
const { t } = useI18n();
const api = useApi();
const { dateTime } = useFormat();
const page = ref(1);
useSeoMeta({ title: () => t('admin.nav.audit'), robots: 'noindex' });
const { data } = await useAsyncData(() => `admin:audit:${page.value}`, () => api<Paginated<any>>('/admin/audit', { query: { page: page.value } }), { watch: [page] });
</script>

<template>
  <div>
    <AppPageHeader :title="t('admin.nav.audit')" :subtitle="t('admin.auditSubtitle')" />
    <div class="card overflow-x-auto">
      <table class="w-full min-w-[640px] text-left text-sm">
        <thead class="border-b border-line text-muted"><tr><th class="px-4 py-3 font-medium">{{ t('admin.col.time') }}</th><th class="px-4 py-3 font-medium">{{ t('admin.col.actor') }}</th><th class="px-4 py-3 font-medium">{{ t('admin.col.action') }}</th><th class="px-4 py-3 font-medium">{{ t('admin.col.entity') }}</th></tr></thead>
        <tbody>
          <tr v-for="a in data?.items ?? []" :key="a.id" class="border-b border-line last:border-0">
            <td class="whitespace-nowrap px-4 py-2.5">{{ dateTime(a.createdAt) }}</td>
            <td class="px-4 py-2.5">{{ a.actor ?? '—' }}</td>
            <td class="px-4 py-2.5 font-mono text-xs">{{ a.action }}</td>
            <td class="px-4 py-2.5 font-mono text-xs">{{ a.entityType }} · {{ a.entityId }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <UiPagination v-if="data" class="mt-6" :page="data.page" :page-count="data.pageCount" @change="(p) => (page = p)" />
  </div>
</template>
