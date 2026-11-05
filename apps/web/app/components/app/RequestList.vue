<script setup lang="ts">
import { ClipboardList } from 'lucide-vue-next';
import type { Paginated, RequestSummaryDto, RequestStatus } from '@carely/shared';
const props = defineProps<{ as: 'customer' | 'professional' }>();
const { t } = useI18n();
const api = useApi();
const route = useRoute();
const router = useRouter();
const localePath = useLocalePath();
const status = computed({
  get: () => (typeof route.query.status === 'string' ? route.query.status : 'ALL'),
  set: (v: string) => router.replace({ query: { ...route.query, status: v === 'ALL' ? undefined : v, page: undefined } }),
});
const page = computed(() => Number(route.query.page) || 1);
const tabs = computed(() =>
  ['ALL', 'SUBMITTED', 'ACCEPTED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((s) => ({ value: s, label: s === 'ALL' ? t('common.all') : t(`requestStatus.${s}`) })),
);
const { data, pending, error, refresh } = await useAsyncData(
  () => `requests:${props.as}:${status.value}:${page.value}`,
  () => api<Paginated<RequestSummaryDto>>('/requests', { query: { as: props.as, status: status.value === 'ALL' ? undefined : (status.value as RequestStatus), page: page.value } }),
  { watch: [status, page] },
);
</script>

<template>
  <div>
    <UiTabs v-model="status" :tabs="tabs" :label="t('request.filterByStatus')" />
    <div class="mt-5">
      <div v-if="pending && !data" class="space-y-3"><UiSkeleton v-for="i in 3" :key="i" class="h-24 w-full" /></div>
      <UiEmptyState v-else-if="error" :title="t('errors.loadFailed')"><UiButton @click="refresh()">{{ t('common.retry') }}</UiButton></UiEmptyState>
      <UiEmptyState v-else-if="!data?.items.length" :icon="ClipboardList" :title="t('request.emptyTitle')" :text="as === 'customer' ? t('request.emptyCustomer') : t('request.emptyPro')">
        <UiButton v-if="as === 'customer'" :to="localePath('/professionals')">{{ t('home.seeAll') }}</UiButton>
      </UiEmptyState>
      <template v-else>
        <ul class="space-y-3"><AppRequestRow v-for="r in data.items" :key="r.id" :r="r" /></ul>
        <UiPagination class="mt-6" :page="data.page" :page-count="data.pageCount" @change="(p) => router.replace({ query: { ...route.query, page: p } })" />
      </template>
    </div>
  </div>
</template>
