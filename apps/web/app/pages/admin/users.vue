<script setup lang="ts">
import type { Paginated } from '@carely/shared';
definePageMeta({ layout: 'admin', middleware: 'admin' });
const { t } = useI18n();
const api = useApi();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const errMsg = useErrorMessage();
const localePath = useLocalePath();
const { date } = useFormat();
useSeoMeta({ title: () => t('admin.nav.users'), robots: 'noindex' });
const q = ref(typeof route.query.q === 'string' ? route.query.q : '');
const page = computed(() => Number(route.query.page) || 1);
const { data, refresh } = await useAsyncData(() => `admin:users:${route.query.q ?? ''}:${page.value}`, () => api<Paginated<any>>('/admin/users', { query: { q: route.query.q, page: page.value } }), { watch: [() => route.query] });
const target = ref<any>(null);
const reason = ref('');
async function toggle() {
  try {
    await api(`/admin/users/${target.value.id}/suspend`, { method: 'POST', body: { suspended: target.value.status === 'ACTIVE', reason: reason.value } });
    toast.success(t('admin.saved'));
    target.value = null;
    reason.value = '';
    refresh();
  } catch (e) {
    toast.error(errMsg(e));
  }
}
</script>

<template>
  <div>
    <AppPageHeader :title="t('admin.nav.users')" />
    <form class="mb-4 flex max-w-md gap-2" role="search" @submit.prevent="router.replace({ query: { q: q || undefined } })">
      <UiInput v-model="q" :label="t('common.search')" :placeholder="t('admin.searchUsers')" class="flex-1 [&_.field-label]:sr-only" />
      <UiButton type="submit" variant="secondary">{{ t('common.search') }}</UiButton>
    </form>
    <div class="card overflow-x-auto">
      <table class="w-full min-w-[680px] text-left text-[0.9375rem]">
        <thead class="border-b border-line text-sm text-muted"><tr><th class="px-4 py-3 font-medium">{{ t('admin.col.name') }}</th><th class="px-4 py-3 font-medium">{{ t('admin.col.roles') }}</th><th class="px-4 py-3 font-medium">{{ t('admin.col.status') }}</th><th class="px-4 py-3 font-medium">{{ t('admin.registered') }}</th><th class="px-4 py-3" /></tr></thead>
        <tbody>
          <tr v-for="u in data?.items ?? []" :key="u.id" class="border-b border-line last:border-0">
            <td class="px-4 py-3"><p class="font-medium">{{ u.name }}</p><p class="text-sm text-muted">{{ u.email }} · {{ u.phone || '—' }}</p></td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-1">
                <UiBadge>{{ t('admin.role.customer') }}</UiBadge>
                <NuxtLink v-if="u.professional" :to="localePath(`/admin/professionals/${u.professional.id}`)"><UiBadge tone="primary">{{ t('admin.role.professional') }} · {{ t(`profileStatus.${u.professional.status}`) }}</UiBadge></NuxtLink>
                <UiBadge v-if="u.isAdmin" tone="info">{{ t('admin.role.admin') }}</UiBadge>
                <UiBadge v-if="u.isDemo" tone="peach">{{ t('demo.label') }}</UiBadge>
              </div>
            </td>
            <td class="px-4 py-3"><UiBadge :tone="u.status === 'ACTIVE' ? 'success' : 'danger'">{{ t(`userStatus.${u.status}`) }}</UiBadge></td>
            <td class="px-4 py-3 text-sm">{{ date(u.createdAt) }}</td>
            <td class="px-4 py-3 text-right"><UiButton v-if="!u.isAdmin" size="sm" variant="ghost" @click="target = u">{{ u.status === 'ACTIVE' ? t('admin.suspend') : t('admin.reinstate') }}</UiButton></td>
          </tr>
        </tbody>
      </table>
    </div>
    <UiPagination v-if="data" class="mt-6" :page="data.page" :page-count="data.pageCount" @change="(p) => router.replace({ query: { ...route.query, page: p } })" />
    <UiDialog :open="!!target" :title="target?.status === 'ACTIVE' ? t('admin.suspendUser') : t('admin.reinstateUser')" size="sm" @update:open="(v) => !v && (target = null)">
      <p class="mb-3">{{ target?.name }} ({{ target?.email }})</p>
      <p v-if="target?.status === 'ACTIVE'" class="mb-3 text-sm text-muted">{{ t('admin.suspendUserHelp') }}</p>
      <UiTextarea v-model="reason" :label="t('admin.internalReason')" :rows="3" />
      <template #footer>
        <UiButton variant="ghost" @click="target = null">{{ t('common.cancel') }}</UiButton>
        <UiButton :variant="target?.status === 'ACTIVE' ? 'danger' : 'primary'" @click="toggle">{{ target?.status === 'ACTIVE' ? t('admin.suspend') : t('admin.reinstate') }}</UiButton>
      </template>
    </UiDialog>
  </div>
</template>
