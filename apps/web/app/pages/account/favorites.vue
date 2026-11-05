<script setup lang="ts">
import { Heart } from 'lucide-vue-next';
import type { ProfessionalCardDto } from '@carely/shared';
definePageMeta({ layout: 'dashboard', section: 'account', middleware: 'auth' });
const { t, locale } = useI18n();
const api = useApi();
const auth = useAuthStore();
const localePath = useLocalePath();
useSeoMeta({ title: () => t('account.nav.favorites'), robots: 'noindex' });
const { data, pending } = await useAsyncData(`favorites:${locale.value}`, () => api<ProfessionalCardDto[]>('/me/favorites', { query: { lang: locale.value } }));
onMounted(() => auth.loadFavorites());
const visible = computed(() => (data.value ?? []).filter((p) => !auth.loaded || auth.favoriteIds.length === 0 || auth.favoriteIds.includes(p.id)));
</script>

<template>
  <div>
    <AppPageHeader :title="t('account.nav.favorites')" />
    <div v-if="pending" class="space-y-3"><UiSkeleton v-for="i in 2" :key="i" class="h-32 w-full" /></div>
    <UiEmptyState v-else-if="!visible.length" :icon="Heart" :title="t('favorites.emptyTitle')" :text="t('favorites.emptyText')">
      <UiButton :to="localePath('/professionals')">{{ t('home.seeAll') }}</UiButton>
    </UiEmptyState>
    <div v-else class="space-y-4"><AppProfessionalCard v-for="p in visible" :key="p.id" :pro="p" /></div>
  </div>
</template>
