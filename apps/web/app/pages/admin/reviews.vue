<script setup lang="ts">
import { Star, Phone } from 'lucide-vue-next';
import type { Paginated, ReviewAdminDto } from '@carely/shared';
definePageMeta({ layout: 'admin', middleware: 'admin' });
const { t } = useI18n();
const api = useApi();
const toast = useToast();
const errMsg = useErrorMessage();
const localePath = useLocalePath();
const { tx, date } = useFormat();
useSeoMeta({ title: () => t('admin.nav.reviews'), robots: 'noindex' });
const status = ref('PENDING');
const lowOnly = ref(false);
const { data, refresh } = await useAsyncData(
  () => `admin:reviews:${status.value}:${lowOnly.value ? 'low' : 'all'}`,
  () => api<Paginated<ReviewAdminDto>>('/admin/reviews', { query: { status: status.value, low: lowOnly.value ? '1' : undefined } }),
  { watch: [status, lowOnly] },
);
async function moderate(id: string, s: 'PUBLISHED' | 'REJECTED') {
  try {
    await api(`/admin/reviews/${id}/moderate`, { method: 'POST', body: { status: s } });
    toast.success(t('admin.saved'));
    refresh();
  } catch (e) {
    toast.error(errMsg(e));
  }
}
const tabs = computed(() => ['PENDING', 'PUBLISHED', 'REJECTED'].map((s) => ({ value: s, label: t(`reviewStatus.${s}`) })));
</script>

<template>
  <div>
    <AppPageHeader :title="t('admin.nav.reviews')" :subtitle="t('admin.reviewsSubtitle')" />
    <UiTabs v-model="status" :tabs="tabs" :label="t('admin.filterStatus')" />
    <UiCheckbox v-model="lowOnly" class="mt-3" :label="t('admin.reviewsLowOnly')" />
    <ul class="mt-4 space-y-3">
      <li v-for="r in data?.items ?? []" :key="r.id" class="card p-4">
        <div class="flex flex-wrap items-center gap-2">
          <span class="flex" :aria-label="t('profile.ratingOf', { n: r.rating })"><Star v-for="i in 5" :key="i" class="size-4" :class="i <= r.rating ? 'fill-[#f5b546] text-[#f5b546]' : 'text-line-strong'" aria-hidden="true" /></span>
          <span class="font-medium">{{ r.customer.name }}</span>
          <span class="text-sm text-muted">→ <NuxtLink :to="localePath(`/professionals/${r.professional.slug}`)" class="hover:underline">{{ r.professional.displayName }}</NuxtLink> · {{ tx(r.serviceName) }} · {{ date(r.createdAt) }}</span>
          <UiBadge v-if="r.isDemo" tone="peach">{{ t('demo.label') }}</UiBadge>
        </div>
        <p v-if="r.body" class="mt-2" :lang="r.locale">{{ r.body }}</p>
        <p v-else class="mt-2 text-sm text-muted">{{ t('admin.reviewNoText') }}</p>
        <p class="mt-2 flex items-center gap-1.5 text-sm">
          <Phone class="size-4 text-muted" aria-hidden="true" />
          <span class="text-muted">{{ t('admin.reviewContact') }}:</span>
          <a v-if="r.contactPhone" :href="`tel:${r.contactPhone}`" class="font-medium text-primary hover:underline">{{ r.contactPhone }}</a>
          <span v-else class="text-muted">—</span>
        </p>
        <div class="mt-3 flex gap-2">
          <UiButton v-if="r.status !== 'PUBLISHED'" size="sm" @click="moderate(r.id, 'PUBLISHED')">{{ t('admin.publish') }}</UiButton>
          <UiButton v-if="r.status !== 'REJECTED'" size="sm" variant="secondary" @click="moderate(r.id, 'REJECTED')">{{ t('admin.reject') }}</UiButton>
        </div>
      </li>
      <li v-if="!data?.items.length"><UiEmptyState :title="t('admin.empty')" /></li>
    </ul>
  </div>
</template>
