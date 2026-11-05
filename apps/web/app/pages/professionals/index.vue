<script setup lang="ts">
import { SlidersHorizontal, SearchX, RefreshCw, MapPin } from 'lucide-vue-next';
import type { Paginated, ProfessionalCardDto, I18nText } from '@carely/shared';
import { parseFilters, toQuery, activeFilterCount, type Filters } from '~/composables/useSearchFilters';

type SearchResult = Paginated<ProfessionalCardDto> & {
  capped: boolean;
  suggestions: null | { nearby: { slug: string; name: I18nText; count: number }[]; relaxed: { drop: string; count: number }[] };
};

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const api = useApi();
const { tx } = useFormat();
const { load, categoryBySlug, locationBySlug } = useTaxonomy();
await load().catch(() => undefined);

const filters = computed(() => parseFilters(route.query));
const draft = ref<Filters>(parseFilters(route.query));
watch(filters, (f) => (draft.value = { ...f }));

const { data, pending, error, refresh } = await useAsyncData(
  () => `search:${locale.value}:${JSON.stringify(toQuery(filters.value))}`,
  () => api<SearchResult>('/professionals', { query: { ...toQuery(filters.value), lang: locale.value } }),
  { watch: [filters] },
);

function apply(f: Filters = draft.value) {
  router.push({ query: toQuery({ ...f }) });
}
function applyAndClose() {
  apply();
  drawerOpen.value = false;
}
function resetFilters() {
  const f = { ...parseFilters({}), category: filters.value.category, location: filters.value.location };
  draft.value = f;
  apply(f);
}
function setPage(p: number) {
  router.push({ query: toQuery({ ...filters.value, page: p }) });
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' });
}
function setSort(sort: string) {
  apply({ ...filters.value, sort: sort as any, page: 1 });
}
const drawerOpen = ref(false);
const count = computed(() => activeFilterCount(filters.value));

const cat = computed(() => categoryBySlug(filters.value.category));
const loc = computed(() => locationBySlug(filters.value.location));
const heading = computed(() => {
  const c = cat.value ? tx(cat.value.name) : t('search.allProfessionals');
  return loc.value ? t('search.headingIn', { what: c, where: tx(loc.value.name) }) : c;
});
const resultText = computed(() => (data.value ? t('search.resultCount', data.value.total) : ''));

const relaxPatch: Record<string, Partial<Filters>> = {
  date: { date: undefined, timeFrom: undefined, timeTo: undefined },
  price: { priceMin: undefined, priceMax: undefined, priceKind: undefined },
  experience: { experienceMin: undefined },
  age: { ageMin: undefined, ageMax: undefined },
  education: { educationMin: undefined },
  rating: { ratingMin: undefined },
  startBy: { startBy: undefined },
  languages: { languages: [] },
  attributes: { attributes: [] },
  verified: { verified: [] },
  service: { service: undefined },
};

useSeoMeta({
  title: () => heading.value,
  description: () => t('search.metaDescription', { what: heading.value }),
  robots: () => (count.value > 0 || filters.value.page > 1 || filters.value.sort !== 'relevance' ? 'noindex, follow' : 'index, follow'),
});
</script>

<template>
  <div class="container-page py-6 md:py-8">
    <!-- Category and location live in the filters (sidebar on desktop, drawer on mobile); no duplicate search bar here. -->
    <div class="sticky top-16 z-20 -mx-4 bg-bg/95 px-4 pb-3 pt-2 backdrop-blur md:static md:mx-0 md:bg-transparent md:p-0 md:backdrop-blur-none lg:hidden">
      <div class="flex items-center gap-2">
        <UiButton variant="secondary" size="sm" @click="drawerOpen = true">
          <SlidersHorizontal class="size-4" aria-hidden="true" />{{ t('filters.title') }}<span v-if="count" class="rounded-full bg-primary px-1.5 text-xs text-white">{{ count }}</span>
        </UiButton>
      </div>
    </div>

    <div class="mt-6 grid gap-8 lg:mt-0 lg:grid-cols-[280px_1fr]">
      <aside class="hidden lg:block" :aria-label="t('filters.title')">
        <div class="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="font-semibold">{{ t('filters.title') }}</h2>
            <button v-if="count" type="button" class="text-sm font-medium text-primary hover:underline" @click="resetFilters">{{ t('filters.reset') }}</button>
          </div>
          <AppSearchFilters v-model="draft" live @commit="apply()" />
        </div>
      </aside>

      <section aria-labelledby="results-h" class="min-w-0">
        <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 id="results-h" class="text-2xl font-semibold">{{ heading }}</h1>
            <p class="mt-1 text-sm text-muted" aria-live="polite" aria-atomic="true">{{ pending ? t('common.loading') : resultText }}</p>
          </div>
          <label class="flex items-center gap-2 text-sm">
            <span class="text-muted">{{ t('search.sortBy') }}</span>
            <select class="control !min-h-10 w-auto py-1.5 text-sm" :value="filters.sort" @change="setSort(($event.target as HTMLSelectElement).value)">
              <option value="relevance">{{ t('search.sort.relevance') }}</option>
              <option value="price_asc">{{ t('search.sort.price_asc') }}</option>
              <option value="price_desc">{{ t('search.sort.price_desc') }}</option>
              <option value="experience">{{ t('search.sort.experience') }}</option>
            </select>
          </label>
        </div>
        <p v-if="filters.sort.startsWith('price')" class="mb-3 text-sm text-muted">{{ t('search.priceSortNote', { unit: t(`priceUnitLong.${filters.priceUnit ?? 'HOUR'}`) }) }}</p>

        <div v-if="pending && !data" class="space-y-4" aria-hidden="true">
          <div v-for="i in 4" :key="i" class="card flex gap-4 p-5"><UiSkeleton class="size-24 rounded-[14px]" /><div class="flex-1 space-y-3"><UiSkeleton class="h-5 w-1/3" /><UiSkeleton class="h-4 w-2/3" /><UiSkeleton class="h-4 w-1/2" /></div></div>
        </div>

        <UiEmptyState v-else-if="error" :icon="RefreshCw" :title="t('search.errorTitle')" :text="t('search.errorText')">
          <UiButton @click="refresh()">{{ t('common.retry') }}</UiButton>
        </UiEmptyState>

        <template v-else-if="data && data.items.length">
          <div class="space-y-4" :class="pending ? 'opacity-60 transition-opacity' : ''">
            <AppProfessionalCard v-for="p in data.items" :key="p.id" :pro="p" />
          </div>
          <UiPagination class="mt-8" :page="data.page" :page-count="data.pageCount" @change="setPage" />
          <p v-if="data.capped" class="mt-4 text-center text-sm text-muted">{{ t('search.capped') }}</p>
        </template>

        <div v-else-if="data" class="space-y-6">
          <UiEmptyState :icon="SearchX" :title="t('search.emptyTitle')" :text="t('search.emptyText')">
            <UiButton v-if="count" variant="secondary" @click="resetFilters">{{ t('filters.reset') }}</UiButton>
          </UiEmptyState>
          <div v-if="data.suggestions?.nearby.length" class="card p-5">
            <h2 class="font-semibold">{{ t('search.nearbyTitle') }}</h2>
            <p class="mt-1 text-sm text-muted">{{ t('search.nearbyText') }}</p>
            <ul class="mt-3 flex flex-wrap gap-2">
              <li v-for="n in data.suggestions.nearby" :key="n.slug">
                <UiButton variant="secondary" size="sm" @click="apply({ ...filters, location: n.slug, page: 1 })">
                  <MapPin class="size-4" aria-hidden="true" />{{ tx(n.name) }} · {{ n.count }}
                </UiButton>
              </li>
            </ul>
          </div>
          <div v-if="data.suggestions?.relaxed.length" class="card p-5">
            <h2 class="font-semibold">{{ t('search.relaxTitle') }}</h2>
            <ul class="mt-3 flex flex-wrap gap-2">
              <li v-for="r in data.suggestions.relaxed" :key="r.drop">
                <UiButton variant="secondary" size="sm" @click="apply({ ...filters, ...relaxPatch[r.drop], page: 1 })">{{ t(`search.relax.${r.drop}`) }} · {{ r.count }}</UiButton>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>

    <UiDrawer v-model:open="drawerOpen" :title="t('filters.title')">
      <AppSearchFilters v-model="draft" />
      <template #footer>
        <UiButton variant="ghost" @click="resetFilters(); drawerOpen = false">{{ t('filters.reset') }}</UiButton>
        <UiButton @click="applyAndClose">{{ t('filters.apply') }}</UiButton>
      </template>
    </UiDrawer>
  </div>
</template>
