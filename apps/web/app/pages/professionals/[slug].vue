<script setup lang="ts">
import { MapPin, BriefcaseBusiness, Languages, Star, ChevronRight, ShieldCheck, BadgeCheck, CalendarDays, Info, GraduationCap, User, CalendarClock } from 'lucide-vue-next';
import type { ProfessionalProfileDto } from '@carely/shared';
import { ATTRIBUTE_GROUPS } from '@carely/shared';

const route = useRoute();
const { t, locale } = useI18n();
const api = useApi();
const localePath = useLocalePath();
const { tx, price, date, weekday, minutes, ymd } = useFormat();
const auth = useAuthStore();
if (auth.user && import.meta.client) auth.loadFavorites();

const slug = computed(() => String(route.params.slug));
const { data: pro, error } = await useAsyncData(`pro:${slug.value}:${locale.value}`, () => api<ProfessionalProfileDto>(`/professionals/${slug.value}`, { query: { lang: locale.value } }));
if (error.value || !pro.value) throw createError({ statusCode: 404, statusMessage: 'Not found', fatal: true });

const p = computed(() => pro.value!);
const requestOpen = ref(false);
const desktopForm = ref<HTMLElement | null>(null);
// The global "Send request" button targets this professional: sidebar form on desktop, drawer on small screens.
useRequestAction().register(() => {
  if (window.matchMedia('(min-width: 1024px)').matches) focusForm(desktopForm.value);
  else requestOpen.value = true;
});
onMounted(() => {
  // Deep link `?request=1` opens the request form (drawer on small screens; the sidebar is always visible on desktop).
  if (route.query.request === '1' && window.matchMedia('(max-width: 1023px)').matches) requestOpen.value = true;
});
const attrGroups = computed(() => ATTRIBUTE_GROUPS.map((g) => ({ group: g, items: p.value.attributes.filter((a) => a.group === g) })).filter((g) => g.items.length));
const scheduleByDay = computed(() =>
  [1, 2, 3, 4, 5, 6, 7].map((d) => ({ day: d, slots: p.value.schedule.filter((s) => s.weekday === d) })),
);
const langNames: Record<string, string> = { hy: 'Հայերեն', ru: 'Русский', en: 'English' };

useSeoMeta({
  title: () => `${p.value.displayName} — ${p.value.headline}`,
  description: () => `${tx(p.value.category)} · ${tx(p.value.homeLocation)} · ${t('card.experience', p.value.experienceYears)}. ${p.value.bio.slice(0, 120)}`,
  ogTitle: () => p.value.displayName,
  ogDescription: () => p.value.headline,
  ogImage: () => p.value.portraitUrl ?? undefined,
});
</script>

<template>
  <div v-if="pro" class="container-page py-6 md:py-8">
    <nav :aria-label="t('profile.breadcrumbs')" class="mb-5 text-sm text-muted">
      <ol class="flex flex-wrap items-center gap-1">
        <li><NuxtLink :to="localePath('/')" class="hover:text-primary">{{ t('nav.home') }}</NuxtLink></li>
        <li aria-hidden="true"><ChevronRight class="size-4" /></li>
        <li><NuxtLink :to="localePath('/professionals')" class="hover:text-primary">{{ t('nav.professionals') }}</NuxtLink></li>
        <li aria-hidden="true"><ChevronRight class="size-4" /></li>
        <li><NuxtLink :to="localePath({ path: '/professionals', query: { category: p.categorySlug } })" class="hover:text-primary">{{ tx(p.category) }}</NuxtLink></li>
        <li aria-hidden="true"><ChevronRight class="size-4" /></li>
        <li aria-current="page" class="text-ink">{{ p.displayName }}</li>
      </ol>
    </nav>

    <UiAlert v-if="p.isDemo" tone="warning" class="mb-5">{{ t('demo.profileNotice') }}</UiAlert>

    <div class="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div class="min-w-0 space-y-6">
        <section class="card p-5 md:p-7">
          <div class="flex flex-col gap-5 sm:flex-row">
            <UiAvatar :src="p.portraitUrl" :name="p.displayName" :size="136" class="self-start" />
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h1 class="text-2xl font-semibold md:text-3xl">{{ p.displayName }}</h1>
                  <p class="mt-1 text-lg text-[#475467]" :lang="p.headlineLocale">{{ p.headline }}</p>
                </div>
                <AppFavoriteButton :profile-id="p.id" :name="p.displayName" />
              </div>
              <ul class="mt-4 grid gap-2 text-[0.9375rem] text-[#475467] sm:grid-cols-2">
                <li class="flex items-center gap-2"><BriefcaseBusiness class="size-4 text-muted" aria-hidden="true" />{{ tx(p.category) }} · {{ t('card.experience', p.experienceYears) }}</li>
                <li class="flex items-center gap-2"><MapPin class="size-4 text-muted" aria-hidden="true" />{{ tx(p.homeLocation) }}</li>
                <li class="flex items-center gap-2"><Languages class="size-4 text-muted" aria-hidden="true" />{{ p.languages.map((l) => t(`lang.${l}`)).join(', ') }}</li>
                <li class="flex items-center gap-2"><AppRatingSummary :rating="p.rating" :rating-count="p.ratingCount" :total-review-count="p.totalReviewCount" /></li>
                <li v-if="p.age" class="flex items-center gap-2"><User class="size-4 text-muted" aria-hidden="true" />{{ t('profile.age', p.age) }}</li>
                <li v-if="p.educationLevel" class="flex items-center gap-2"><GraduationCap class="size-4 text-muted" aria-hidden="true" />{{ t(`education.${p.educationLevel.toLowerCase()}`) }}</li>
                <li v-if="p.availableFrom" class="flex items-center gap-2 sm:col-span-2"><CalendarClock class="size-4 text-muted" aria-hidden="true" />{{ t('profile.availableFrom', { date: ymd(p.availableFrom, { month: 'long' }) }) }}</li>
              </ul>
            </div>
          </div>
        </section>

        <section class="card p-5 md:p-7" aria-labelledby="ver-h">
          <h2 id="ver-h" class="text-lg font-semibold">{{ t('profile.verification') }}</h2>
          <ul v-if="p.verifications.length" class="mt-4 space-y-3">
            <li v-for="v in p.verifications" :key="v.kind + v.title" class="flex items-start gap-3">
              <component :is="v.kind === 'IDENTITY' ? ShieldCheck : BadgeCheck" class="mt-0.5 size-5 shrink-0" :class="v.kind === 'IDENTITY' ? 'text-primary' : 'text-success'" aria-hidden="true" />
              <div>
                <p class="font-medium">{{ t(`verification.kind.${v.kind}`) }}</p>
                <p class="text-sm text-muted">{{ v.title }} · {{ t('profile.verifiedOn', { date: date(v.verifiedAt) }) }}</p>
              </div>
            </li>
          </ul>
          <p v-else class="mt-2 text-[#475467]">{{ t('profile.noVerifications') }}</p>
          <p class="mt-4 text-sm text-muted">
            {{ t('profile.verificationNote') }} <NuxtLink :to="localePath('/trust')" class="font-medium text-primary hover:underline">{{ t('profile.learnMore') }}</NuxtLink>
          </p>
        </section>

        <section class="card p-5 md:p-7" aria-labelledby="about-h">
          <h2 id="about-h" class="text-lg font-semibold">{{ t('profile.about') }}</h2>
          <p v-if="!p.bioIsOriginal || p.bioLocale !== locale" class="mt-2 flex items-center gap-1.5 text-sm text-muted">
            <Info class="size-4" aria-hidden="true" />{{ t('profile.originalLanguage', { lang: langNames[p.bioLocale] }) }}
          </p>
          <div class="prose-care mt-3 whitespace-pre-line text-[#344054]" :lang="p.bioLocale">{{ p.bio }}</div>
          <div v-if="attrGroups.length" class="mt-5 space-y-3">
            <div v-for="g in attrGroups" :key="g.group">
              <h3 class="text-sm font-medium text-muted">{{ t(`attributeGroup.${g.group}`) }}</h3>
              <ul class="mt-1.5 flex flex-wrap gap-1.5">
                <li v-for="a in g.items" :key="a.id"><UiBadge>{{ tx(a.name) }}</UiBadge></li>
              </ul>
            </div>
          </div>
        </section>

        <section class="card p-5 md:p-7" aria-labelledby="svc-h">
          <h2 id="svc-h" class="text-lg font-semibold">{{ t('profile.servicesPrices') }}</h2>
          <ul class="mt-3 divide-y divide-line">
            <li v-for="s in p.services" :key="s.service.id" class="flex items-center justify-between gap-4 py-3">
              <span>{{ tx(s.service.name) }}</span>
              <span class="font-medium">{{ price(s.price) }}</span>
            </li>
          </ul>
          <p class="mt-3 text-sm text-muted">{{ t('profile.priceNote') }}</p>
        </section>

        <section class="card p-5 md:p-7" aria-labelledby="area-h">
          <h2 id="area-h" class="text-lg font-semibold">{{ t('profile.serviceArea') }}</h2>
          <ul class="mt-3 flex flex-wrap gap-2">
            <li v-for="a in p.serviceAreas" :key="a.slug"><UiBadge tone="primary"><MapPin class="size-3.5" aria-hidden="true" />{{ tx(a.name) }}</UiBadge></li>
          </ul>
        </section>

        <section class="card p-5 md:p-7" aria-labelledby="sch-h">
          <h2 id="sch-h" class="flex items-center gap-2 text-lg font-semibold"><CalendarDays class="size-5 text-muted" aria-hidden="true" />{{ t('profile.schedule') }}</h2>
          <table class="mt-3 w-full text-[0.9375rem]">
            <caption class="sr-only">{{ t('profile.schedule') }}</caption>
            <tbody>
              <tr v-for="d in scheduleByDay" :key="d.day" class="border-b border-line last:border-0">
                <th scope="row" class="w-32 py-2.5 text-left font-medium">{{ weekday(d.day, 'long') }}</th>
                <td class="py-2.5" :class="d.slots.length ? '' : 'text-muted'">
                  {{ d.slots.length ? d.slots.map((s) => `${minutes(s.startMinute)}–${minutes(s.endMinute)}`).join(', ') : t('profile.notScheduled') }}
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="p.exceptions.length" class="mt-4">
            <h3 class="text-sm font-medium text-muted">{{ t('profile.exceptions') }}</h3>
            <ul class="mt-2 space-y-1 text-sm">
              <li v-for="e in p.exceptions" :key="e.date + e.startMinute">
                {{ ymd(e.date) }} —
                <span :class="e.available ? 'text-success' : 'text-danger'">{{ e.available ? t('profile.extraHours') : t('profile.unavailable') }}</span>
                <span v-if="e.startMinute != null"> ({{ minutes(e.startMinute) }}–{{ minutes(e.endMinute ?? 1440) }})</span>
              </li>
            </ul>
          </div>
          <p class="mt-4 text-sm text-muted">{{ t('profile.scheduleNote') }}</p>
        </section>

        <section v-if="p.reviews.length" class="card p-5 md:p-7" aria-labelledby="rev-h">
          <h2 id="rev-h" class="text-lg font-semibold">{{ t('profile.reviews') }}</h2>
          <ul class="mt-4 space-y-5">
            <li v-for="r in p.reviews" :key="r.id" class="border-b border-line pb-5 last:border-0 last:pb-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="flex" :aria-label="t('profile.ratingOf', { n: r.rating })">
                  <Star v-for="i in 5" :key="i" class="size-4" :class="i <= r.rating ? 'fill-[#f5b546] text-[#f5b546]' : 'text-line-strong'" aria-hidden="true" />
                </span>
                <span class="font-medium">{{ r.authorName }}</span>
                <span class="text-sm text-muted">· {{ tx(r.serviceName) }} · {{ date(r.createdAt) }}</span>
                <UiBadge v-if="r.isDemo" tone="peach">{{ t('demo.label') }}</UiBadge>
              </div>
              <p v-if="r.body" class="mt-2 text-[#344054]" :lang="r.locale">{{ r.body }}</p>
            </li>
          </ul>
        </section>

        <!-- Mobile: the request panel lives in a drawer, so the notice sits at the end of the profile. -->
        <AppPlatformNotice class="px-1 lg:hidden" />
      </div>

      <aside class="hidden lg:block" :aria-label="t('request.title')">
        <div class="sticky top-24">
          <div ref="desktopForm" class="card p-5">
            <h2 class="mb-4 text-lg font-semibold">{{ t('request.title') }}</h2>
            <AppRequestPanel :pro="p" />
          </div>
          <AppPlatformNotice class="mt-4 px-1" />
        </div>
      </aside>
    </div>

    <UiDrawer v-model:open="requestOpen" :title="t('request.title')" :description="p.displayName">
      <AppRequestPanel v-if="requestOpen" :pro="p" />
      <AppPlatformNotice class="mt-5" />
    </UiDrawer>
  </div>
</template>
