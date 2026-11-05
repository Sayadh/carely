<script setup lang="ts">
import { ArrowRight, ClipboardCheck, Search, MessageCircleReply, ShieldCheck, BadgeCheck, FileSearch, Handshake, Scale } from 'lucide-vue-next';
import type { ProfessionalCardDto } from '@carely/shared';

const { t, tm, rt, locale } = useI18n();
const localePath = useLocalePath();
const api = useApi();

const { data: featured } = await useAsyncData(`featured:${locale.value}`, () => api<ProfessionalCardDto[]>('/professionals/featured', { query: { lang: locale.value } }), { default: () => [] });

useSeoMeta({ title: () => t('home.metaTitle'), description: () => t('home.metaDescription'), ogTitle: () => t('home.metaTitle'), ogDescription: () => t('home.metaDescription') });

function onSearch(q: { category?: string; location?: string }) {
  navigateTo(localePath({ path: '/professionals', query: { ...q } }));
}
const steps = computed(() => [
  { icon: Search, title: t('home.steps.1.title'), text: t('home.steps.1.text') },
  { icon: MessageCircleReply, title: t('home.steps.2.title'), text: t('home.steps.2.text') },
  { icon: ClipboardCheck, title: t('home.steps.3.title'), text: t('home.steps.3.text') },
]);
const faq = computed(() => (tm('faq.items') as any[]).slice(0, 4).map((i) => ({ q: rt(i.q), a: rt(i.a) })));
</script>

<template>
  <div>
    <AppHomeHero @search="onSearch" />

    <!-- Real professionals -->
    <section v-if="featured.length" class="container-page mt-16 md:mt-20" aria-labelledby="featured-h">
      <div class="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 id="featured-h" class="text-2xl font-semibold md:text-3xl">{{ t('home.featuredTitle') }}</h2>
          <p class="mt-1 text-muted">{{ t('home.featuredText') }}</p>
        </div>
        <NuxtLink :to="localePath('/professionals')" class="hidden shrink-0 items-center gap-1 font-medium text-primary hover:underline sm:inline-flex">
          {{ t('home.seeAll') }} <ArrowRight class="size-4" aria-hidden="true" />
        </NuxtLink>
      </div>
      <div class="grid gap-4">
        <AppProfessionalCard v-for="p in featured.slice(0, 3)" :key="p.id" :pro="p" heading-level="h3" />
      </div>
      <UiButton variant="secondary" :to="localePath('/professionals')" block class="mt-4 sm:hidden">{{ t('home.seeAll') }}</UiButton>
    </section>

    <!-- How it works -->
    <section class="container-page mt-16 md:mt-24" aria-labelledby="how-h">
      <h2 id="how-h" class="text-2xl font-semibold md:text-3xl">{{ t('home.howTitle') }}</h2>
      <ol class="mt-6 grid gap-4 md:grid-cols-3">
        <li v-for="(s, i) in steps" :key="i" class="card p-6">
          <div class="flex items-center gap-3">
            <span class="flex size-10 items-center justify-center rounded-full bg-primary text-white"><component :is="s.icon" class="size-5" aria-hidden="true" /></span>
            <span class="text-sm font-medium text-muted">{{ t('home.stepN', { n: i + 1 }) }}</span>
          </div>
          <h3 class="mt-4 text-lg font-semibold">{{ s.title }}</h3>
          <p class="mt-2 text-[#475467]">{{ s.text }}</p>
        </li>
      </ol>
      <p class="mt-4 text-sm text-muted">{{ t('home.howNote') }}</p>
    </section>

    <!-- Personal matching: Carely finds and introduces a professional; terms and responsibility stay between client and professional -->
    <section class="container-page mt-16 md:mt-24" aria-labelledby="match-h">
      <div class="card grid gap-8 p-6 md:grid-cols-[1.1fr_0.9fr] md:p-10">
        <div>
          <h2 id="match-h" class="text-2xl font-semibold md:text-3xl">{{ t('home.match.title') }}</h2>
          <p class="mt-3 text-[#344054]">{{ t('home.match.text') }}</p>
          <div class="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <UiButton size="lg" :to="localePath('/request')">{{ t('home.match.contact') }}</UiButton>
            <AppCallButton />
            <NuxtLink :to="localePath('/terms')" class="font-medium text-primary hover:underline">
              {{ t('home.match.terms') }}&nbsp;<ArrowRight class="inline size-4 align-[-0.15em]" aria-hidden="true" />
            </NuxtLink>
          </div>
        </div>
        <ul class="grid content-start gap-3">
          <li class="flex gap-4 rounded-[var(--radius-card)] bg-bg p-4">
            <Handshake class="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
            <p class="text-[0.9375rem] text-[#344054]">{{ t('home.match.agreement') }}</p>
          </li>
          <li class="flex gap-4 rounded-[var(--radius-card)] bg-bg p-4">
            <Scale class="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
            <p class="text-[0.9375rem] text-[#344054]">{{ t('home.match.responsibility') }} <strong class="font-semibold text-ink">{{ t('home.match.responsibilityOwner') }}</strong></p>
          </li>
        </ul>
      </div>
    </section>

    <!-- Verification -->
    <section class="container-page mt-16 md:mt-24" aria-labelledby="trust-h">
      <div class="grid gap-8 rounded-[22px] bg-primary-soft p-6 md:grid-cols-[0.9fr_1.1fr] md:p-10">
        <div>
          <h2 id="trust-h" class="text-2xl font-semibold md:text-3xl">{{ t('home.trustTitle') }}</h2>
          <p class="mt-3 text-[#344054]">{{ t('home.trustText') }}</p>
          <UiButton variant="secondary" :to="localePath('/trust')" class="mt-6">{{ t('home.trustMore') }}</UiButton>
        </div>
        <ul class="grid gap-3">
          <li class="flex gap-4 rounded-[var(--radius-card)] bg-surface p-4">
            <ShieldCheck class="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
            <div><p class="font-medium">{{ t('verification.kind.IDENTITY') }}</p><p class="text-[0.9375rem] text-muted">{{ t('home.trust.identity') }}</p></div>
          </li>
          <li class="flex gap-4 rounded-[var(--radius-card)] bg-surface p-4">
            <BadgeCheck class="mt-0.5 size-6 shrink-0 text-success" aria-hidden="true" />
            <div><p class="font-medium">{{ t('home.trust.qualTitle') }}</p><p class="text-[0.9375rem] text-muted">{{ t('home.trust.qual') }}</p></div>
          </li>
          <li class="flex gap-4 rounded-[var(--radius-card)] bg-surface p-4">
            <FileSearch class="mt-0.5 size-6 shrink-0 text-[#9a4a2a]" aria-hidden="true" />
            <div><p class="font-medium">{{ t('home.trust.limitsTitle') }}</p><p class="text-[0.9375rem] text-muted">{{ t('home.trust.limits') }}</p></div>
          </li>
        </ul>
      </div>
    </section>

    <!-- Become a professional -->
    <section class="container-page mt-16 md:mt-24" aria-labelledby="pro-h">
      <div class="card flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-10">
        <div class="max-w-2xl">
          <h2 id="pro-h" class="text-2xl font-semibold md:text-3xl">{{ t('home.proTitle') }}</h2>
          <p class="mt-3 text-[#475467]">{{ t('home.proText') }}</p>
        </div>
        <UiButton size="lg" :to="localePath('/become-a-professional')" class="shrink-0">{{ t('nav.becomePro') }}</UiButton>
      </div>
    </section>

    <!-- FAQ -->
    <section class="container-page mt-16 md:mt-24" aria-labelledby="faq-h">
      <div class="grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2 id="faq-h" class="text-2xl font-semibold md:text-3xl">{{ t('faq.title') }}</h2>
          <NuxtLink :to="localePath('/faq')" class="mt-3 inline-flex items-center gap-1 font-medium text-primary hover:underline">{{ t('home.allQuestions') }} <ArrowRight class="size-4" aria-hidden="true" /></NuxtLink>
        </div>
        <AppFaq :items="faq" />
      </div>
    </section>
  </div>
</template>
