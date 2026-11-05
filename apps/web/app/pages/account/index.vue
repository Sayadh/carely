<script setup lang="ts">
import { ArrowRight, BriefcaseBusiness } from 'lucide-vue-next';
import type { Paginated, RequestSummaryDto } from '@carely/shared';
definePageMeta({ layout: 'dashboard', section: 'account', middleware: 'auth' });
const { t } = useI18n();
const api = useApi();
const auth = useAuthStore();
const localePath = useLocalePath();
useSeoMeta({ title: () => t('account.title'), robots: 'noindex' });

const { data } = await useAsyncData('account:overview', () => api<Paginated<RequestSummaryDto>>('/requests', { query: { as: 'customer', page: 1 } }));
const items = computed(() => data.value?.items ?? []);
const toConfirm = computed(() => items.value.filter((r) => r.status === 'ACCEPTED'));
const upcoming = computed(() => items.value.filter((r) => r.status === 'CONFIRMED'));
const waiting = computed(() => items.value.filter((r) => r.status === 'SUBMITTED'));
const toReview = computed(() => items.value.filter((r) => r.status === 'COMPLETED' && !r.hasReview));
</script>

<template>
  <div>
    <AppPageHeader :title="t('account.greeting', { name: auth.user?.name?.split(' ')[0] })" :subtitle="t('account.subtitle')" />
    <div class="space-y-8">
      <section v-if="toConfirm.length" aria-labelledby="h-confirm">
        <h2 id="h-confirm" class="mb-3 text-lg font-semibold">{{ t('account.needsConfirmation') }}</h2>
        <UiAlert tone="warning" class="mb-3">{{ t('account.confirmHint') }}</UiAlert>
        <ul class="space-y-3"><AppRequestRow v-for="r in toConfirm" :key="r.id" :r="r" /></ul>
      </section>
      <section v-if="upcoming.length" aria-labelledby="h-up">
        <h2 id="h-up" class="mb-3 text-lg font-semibold">{{ t('account.upcoming') }}</h2>
        <ul class="space-y-3"><AppRequestRow v-for="r in upcoming" :key="r.id" :r="r" /></ul>
      </section>
      <section v-if="waiting.length" aria-labelledby="h-wait">
        <h2 id="h-wait" class="mb-3 text-lg font-semibold">{{ t('account.waiting') }}</h2>
        <ul class="space-y-3"><AppRequestRow v-for="r in waiting" :key="r.id" :r="r" /></ul>
      </section>
      <section v-if="toReview.length" aria-labelledby="h-rev">
        <h2 id="h-rev" class="mb-3 text-lg font-semibold">{{ t('account.leaveReview') }}</h2>
        <ul class="space-y-3"><AppRequestRow v-for="r in toReview" :key="r.id" :r="r" /></ul>
      </section>
      <UiEmptyState v-if="!toConfirm.length && !upcoming.length && !waiting.length && !toReview.length" :title="t('account.nothingActionable')" :text="t('account.nothingText')">
        <UiButton :to="localePath('/professionals')">{{ t('search.submit') }}</UiButton>
        <UiButton variant="secondary" :to="localePath('/request')">{{ t('home.match.contact') }}</UiButton>
      </UiEmptyState>

      <div v-if="!auth.professional" class="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-start gap-3">
          <BriefcaseBusiness class="mt-0.5 size-6 text-primary" aria-hidden="true" />
          <div><p class="font-semibold">{{ t('account.becomeProTitle') }}</p><p class="text-[0.9375rem] text-muted">{{ t('account.becomeProText') }}</p></div>
        </div>
        <UiButton variant="soft" :to="localePath('/become-a-professional')">{{ t('nav.becomePro') }} <ArrowRight class="size-4" aria-hidden="true" /></UiButton>
      </div>
    </div>
  </div>
</template>
