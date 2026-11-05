<script setup lang="ts">
import { Bell } from 'lucide-vue-next';
import type { NotificationDto, Paginated } from '@carely/shared';
definePageMeta({ layout: 'dashboard', section: 'account', middleware: 'auth' });
const { t, te } = useI18n();
const api = useApi();
const auth = useAuthStore();
const localePath = useLocalePath();
const { dateTime } = useFormat();
const page = ref(1);
useSeoMeta({ title: () => t('account.nav.notifications'), robots: 'noindex' });
const { data, refresh } = await useAsyncData('notifications', () => api<Paginated<NotificationDto>>('/notifications', { query: { page: page.value } }), { watch: [page] });

function text(n: NotificationDto) {
  const p: Record<string, string | number> = { ...n.params };
  if (p.by) p.by = t(`eventActor.${p.by}`);
  if (p.expiresAt) p.expiresAt = dateTime(String(p.expiresAt));
  const key = `notifications.${n.type}`;
  return te(key) ? t(key, p) : n.type;
}
function link(n: NotificationDto) {
  if (n.params.requestId) return localePath(`/requests/${n.params.requestId}`);
  if (n.type.startsWith('PROFILE_') || n.type.startsWith('QUALIFICATION_')) return localePath('/pro');
  return null;
}
async function open(n: NotificationDto) {
  if (!n.readAt) await api(`/notifications/${n.id}/read`, { method: 'POST' }).catch(() => undefined);
  auth.fetch();
  const to = link(n);
  if (to) navigateTo(to);
  else refresh();
}
async function readAll() {
  await api('/notifications/read-all', { method: 'POST' });
  await Promise.all([refresh(), auth.fetch()]);
}
</script>

<template>
  <div>
    <AppPageHeader :title="t('account.nav.notifications')">
      <UiButton v-if="data?.items.some((n) => !n.readAt)" variant="secondary" size="sm" @click="readAll">{{ t('notificationsPage.markAll') }}</UiButton>
    </AppPageHeader>
    <UiEmptyState v-if="!data?.items.length" :icon="Bell" :title="t('notificationsPage.empty')" />
    <template v-else>
      <ul class="card divide-y divide-line overflow-hidden">
        <li v-for="n in data.items" :key="n.id">
          <button type="button" class="flex w-full items-start gap-3 px-4 py-4 text-left hover:bg-bg" @click="open(n)">
            <span class="mt-2 size-2 shrink-0 rounded-full" :class="n.readAt ? 'bg-transparent' : 'bg-primary'" :aria-label="n.readAt ? undefined : t('notificationsPage.unread')" />
            <span class="min-w-0 flex-1">
              <span class="block" :class="n.readAt ? 'text-[#475467]' : 'font-medium'">{{ text(n) }}</span>
              <span class="mt-0.5 block text-sm text-muted">{{ dateTime(n.createdAt) }}</span>
            </span>
          </button>
        </li>
      </ul>
      <UiPagination class="mt-6" :page="data.page" :page-count="data.pageCount" @change="(p) => (page = p)" />
    </template>
  </div>
</template>
