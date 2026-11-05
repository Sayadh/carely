<script setup lang="ts">
import type { Paginated, SupportInquiryDto } from '@carely/shared';
definePageMeta({ layout: 'admin', middleware: 'admin' });
const { t } = useI18n();
const api = useApi();
const route = useRoute();
const toast = useToast();
const errMsg = useErrorMessage();
const localePath = useLocalePath();
const { dateTime } = useFormat();
useSeoMeta({ title: () => t('admin.nav.inquiries'), robots: 'noindex' });
const status = ref(typeof route.query.status === 'string' ? route.query.status : 'OPEN');
const { data, refresh } = await useAsyncData(() => `admin:inq:${status.value}`, () => api<Paginated<SupportInquiryDto>>('/admin/inquiries', { query: { status: status.value === 'ALL' ? undefined : status.value } }), { watch: [status] });
const notes = reactive<Record<string, string>>({});
watch(data, (d) => d?.items.forEach((i) => (notes[i.id] ??= i.adminNote ?? '')), { immediate: true });
async function update(id: string, s: 'OPEN' | 'CLOSED') {
  try {
    await api(`/admin/inquiries/${id}`, { method: 'PATCH', body: { status: s, adminNote: notes[id] } });
    toast.success(t('admin.saved'));
    refresh();
  } catch (e) {
    toast.error(errMsg(e));
  }
}
const tabs = computed(() => ['OPEN', 'CLOSED', 'ALL'].map((s) => ({ value: s, label: s === 'ALL' ? t('common.all') : t(`supportStatus.${s}`) })));
</script>

<template>
  <div>
    <AppPageHeader :title="t('admin.nav.inquiries')" />
    <UiTabs v-model="status" :tabs="tabs" :label="t('admin.filterStatus')" />
    <ul class="mt-4 space-y-3">
      <li v-for="i in data?.items ?? []" :key="i.id" class="card p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="font-medium">{{ i.name }} · <a :href="`mailto:${i.email}`" class="text-primary hover:underline">{{ i.email }}</a></p>
          <div class="flex items-center gap-2"><UiBadge>{{ t(`supportTopic.${i.topic}`) }}</UiBadge><UiBadge :tone="i.status === 'OPEN' ? 'warning' : 'neutral'">{{ t(`supportStatus.${i.status}`) }}</UiBadge></div>
        </div>
        <p class="text-sm text-muted">{{ dateTime(i.createdAt) }}<template v-if="i.requestId"> · <NuxtLink :to="localePath(`/admin/requests/${i.requestId}`)" class="text-primary hover:underline">{{ t('admin.linkedRequest') }}</NuxtLink></template></p>
        <p class="mt-2 whitespace-pre-line">{{ i.message }}</p>
        <UiTextarea v-model="notes[i.id]" :label="t('admin.internalNote')" :rows="2" class="mt-3" />
        <div class="mt-2 flex gap-2">
          <UiButton v-if="i.status === 'OPEN'" size="sm" @click="update(i.id, 'CLOSED')">{{ t('admin.close') }}</UiButton>
          <UiButton v-else size="sm" variant="secondary" @click="update(i.id, 'OPEN')">{{ t('admin.reopen') }}</UiButton>
          <UiButton size="sm" variant="ghost" @click="update(i.id, i.status)">{{ t('admin.saveNote') }}</UiButton>
        </div>
      </li>
      <li v-if="!data?.items.length"><UiEmptyState :title="t('admin.empty')" /></li>
    </ul>
  </div>
</template>
