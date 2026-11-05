<script setup lang="ts">
import type { Component } from 'vue';
import {
  LayoutDashboard, ClipboardList, Heart, Bell, Settings, Clock, UserRound, ShieldCheck, Users,
  MessageSquareText, Star, Tags, MapPinned, ScrollText, FileCheck2, ExternalLink, PhoneCall,
} from 'lucide-vue-next';

const props = defineProps<{ section: 'account' | 'pro' | 'admin' }>();
const localePath = useLocalePath();
const { t } = useI18n();
const auth = useAuthStore();

type Item = { to: string; label: string; icon: Component; exact?: boolean; badge?: number };
const route = useRoute();
const api = useApi();
// New team requests waiting for a call; refreshed on navigation so handled leads drop off the count.
const { data: adminStats } = useAsyncData('admin:nav-stats', () => (props.section === 'admin' ? api<Record<string, number>>('/admin/stats') : Promise.resolve(null)), {
  server: false,
  watch: [() => route.path],
});
const items = computed<Item[]>(() => {
  if (props.section === 'admin')
    return [
      { to: '/admin', label: t('admin.nav.overview'), icon: LayoutDashboard, exact: true },
      { to: '/admin/professionals', label: t('admin.nav.applications'), icon: FileCheck2 },
      { to: '/admin/users', label: t('admin.nav.users'), icon: Users },
      { to: '/admin/leads', label: t('admin.nav.leads'), icon: PhoneCall, badge: adminStats.value?.newLeads || undefined },
      { to: '/admin/requests', label: t('admin.nav.requests'), icon: ClipboardList },
      { to: '/admin/reviews', label: t('admin.nav.reviews'), icon: Star },
      { to: '/admin/inquiries', label: t('admin.nav.inquiries'), icon: MessageSquareText },
      { to: '/admin/taxonomy', label: t('admin.nav.taxonomy'), icon: Tags },
      { to: '/admin/locations', label: t('admin.nav.locations'), icon: MapPinned },
      { to: '/admin/audit', label: t('admin.nav.audit'), icon: ScrollText },
    ];
  if (props.section === 'pro')
    return [
      { to: '/pro', label: t('pro.nav.overview'), icon: LayoutDashboard, exact: true },
      { to: '/pro/availability', label: t('pro.nav.availability'), icon: Clock },
      { to: '/pro/profile', label: t('pro.nav.profile'), icon: UserRound },
      { to: '/pro/verification', label: t('pro.nav.verification'), icon: ShieldCheck },
      { to: '/account/notifications', label: t('account.nav.notifications'), icon: Bell },
    ];
  return [
    { to: '/account', label: t('account.nav.overview'), icon: LayoutDashboard, exact: true },
    { to: '/account/favorites', label: t('account.nav.favorites'), icon: Heart },
    { to: '/account/notifications', label: t('account.nav.notifications'), icon: Bell },
    { to: '/account/settings', label: t('account.nav.settings'), icon: Settings },
  ];
});
const isActive = (i: Item) => {
  const p = localePath(i.to);
  return i.exact ? route.path === p : route.path === p || route.path.startsWith(p + '/');
};
const sectionLabel = computed(() => ({ account: t('nav.myAccount'), pro: t('nav.proDashboard'), admin: t('nav.admin') })[props.section]);
</script>

<template>
  <div class="min-h-screen bg-bg">
    <AppDemoBanner />
    <header class="sticky top-0 z-30 border-b border-line bg-surface">
      <div class="flex h-14 items-center gap-3 px-4 md:px-6">
        <NuxtLink :to="localePath('/')" :aria-label="t('nav.home')"><AppLogo /></NuxtLink>
        <span class="hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
        <span class="hidden whitespace-nowrap text-[0.9375rem] font-medium text-muted sm:block">{{ sectionLabel }}</span>
        <div class="ml-auto flex items-center gap-1">
          <NuxtLink v-if="section !== 'account'" :to="localePath('/account')" class="hidden whitespace-nowrap rounded-lg px-3 py-2 text-sm text-muted hover:bg-bg lg:block">{{ t('nav.myAccount') }}</NuxtLink>
          <NuxtLink v-if="section !== 'pro' && auth.professional" :to="localePath('/pro')" class="hidden whitespace-nowrap rounded-lg px-3 py-2 text-sm text-muted hover:bg-bg lg:block">{{ t('nav.proDashboard') }}</NuxtLink>
          <NuxtLink :to="localePath('/professionals')" class="hidden items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-muted hover:bg-bg lg:inline-flex">
            {{ t('nav.professionals') }} <ExternalLink class="size-3.5" aria-hidden="true" />
          </NuxtLink>
          <AppLanguageSwitcher />
          <AppUserMenu />
        </div>
      </div>
      <!-- Mobile section navigation -->
      <nav class="flex gap-1 overflow-x-auto border-t border-line px-3 py-2 lg:hidden" :aria-label="sectionLabel">
        <NuxtLink
          v-for="i in items"
          :key="i.to"
          :to="localePath(i.to)"
          class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm"
          :class="isActive(i) ? 'bg-primary-soft font-medium text-primary' : 'text-muted'"
          :aria-current="isActive(i) ? 'page' : undefined"
        >
          <component :is="i.icon" class="size-4" aria-hidden="true" />{{ i.label }}
          <span v-if="i.badge" class="rounded-full bg-primary px-1.5 text-xs font-semibold leading-5 text-white">{{ i.badge }}</span>
        </NuxtLink>
      </nav>
    </header>
    <div class="mx-auto flex max-w-[1320px] gap-8 px-4 py-6 md:px-6 md:py-8">
      <aside class="hidden w-60 shrink-0 lg:block">
        <nav class="sticky top-20 flex flex-col gap-0.5" :aria-label="sectionLabel">
          <NuxtLink
            v-for="i in items"
            :key="i.to"
            :to="localePath(i.to)"
            class="flex min-h-10 items-center gap-3 rounded-[var(--radius-control)] px-3 text-[0.9375rem]"
            :class="isActive(i) ? 'bg-surface font-medium text-primary shadow-[var(--shadow-card)]' : 'text-[#475467] hover:bg-surface/70 hover:text-ink'"
            :aria-current="isActive(i) ? 'page' : undefined"
          >
            <component :is="i.icon" class="size-[18px]" aria-hidden="true" />{{ i.label }}
            <span v-if="i.badge" class="ml-auto rounded-full bg-primary px-2 text-xs font-semibold leading-5 text-white" :aria-label="t('admin.newCount', { n: i.badge })">{{ i.badge }}</span>
          </NuxtLink>
        </nav>
      </aside>
      <main id="main" class="min-w-0 flex-1" tabindex="-1"><slot /></main>
    </div>
  </div>
</template>
