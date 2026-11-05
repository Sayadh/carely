<script setup lang="ts">
import { Search, MapPin, ChevronRight } from 'lucide-vue-next';

/**
 * Homepage hero: photo on the right with a soft fade into the text area (desktop),
 * photo as a background behind a light overlay (mobile). Heading always sits on a readable light area.
 */
const emit = defineEmits<{ search: [q: { category?: string; location?: string }] }>();
const { t } = useI18n();
const config = useRuntimeConfig();
const localePath = useLocalePath();
const { categories, load } = useTaxonomy();
const { tx } = useFormat();
await load().catch(() => undefined);

// Temporary demo photo cropped from the concept image; replace via NUXT_PUBLIC_HERO_IMAGE with a licensed photo.
const image = computed(() => config.public.heroImage || '/images/hero-demo.webp');
const isDemoImage = computed(() => !config.public.heroImage);

const category = ref<string>();
const location = ref<string>();
const locationOptions = useLocationOptions();
const categoryOptions = computed(() => (categories.value ?? []).map((c) => ({ value: c.slug, label: tx(c.name) })));
function submit() {
  emit('search', { category: category.value || undefined, location: location.value || undefined });
}

// Calm, low-saturation tints — one per category, consistent everywhere they appear.
const tint: Record<string, string> = {
  childcare: 'bg-[#fde9df] text-[#b4532a]',
  'elderly-care': 'bg-[#e3f1e8] text-[#176b61]',
  'patient-care': 'bg-[#e4edf7] text-[#2f5f8f]',
  'pet-care': 'bg-[#fbf1d6] text-[#8a6412]',
};
</script>

<template>
  <section class="container-page pt-4 md:pt-6" aria-labelledby="hero-h">
    <div class="relative isolate overflow-hidden rounded-[22px] bg-[#f6f3ef] md:min-h-[440px]">
      <!-- Photo -->
      <img
        :src="image"
        :alt="t('home.heroImageAlt')"
        width="966"
        height="572"
        fetchpriority="high"
        class="absolute inset-x-0 top-0 -z-20 h-[330px] w-full object-cover object-[52%_20%] md:inset-y-0 md:left-auto md:right-0 md:h-full md:w-[64%] md:object-[center_30%]"
      />
      <!-- Readability overlays: bottom-up on mobile, left-to-right on desktop -->
      <div class="absolute inset-x-0 top-0 -z-10 h-[331px] bg-gradient-to-t from-[#f6f3ef] from-[12%] via-[#f6f3ef]/45 via-[45%] to-transparent md:hidden" aria-hidden="true" />
      <div class="absolute inset-y-0 left-0 -z-10 hidden w-[66%] bg-gradient-to-r from-[#f6f3ef] from-[58%] to-transparent md:block" aria-hidden="true" />

      <div class="flex min-h-[560px] flex-col justify-end px-5 pb-6 pt-64 md:min-h-[440px] md:justify-center md:px-12 md:py-14">
        <h1 id="hero-h" class="max-w-[11.5em] text-[2.15rem] font-bold leading-[1.12] tracking-tight text-ink md:text-[3.25rem]">{{ t('home.heroTitle') }}</h1>
        <p class="mt-3 max-w-xl text-lg text-[#344054] md:text-xl">{{ t('home.heroText') }}</p>

        <form
          role="search"
          class="mt-7 grid w-full max-w-[840px] gap-2 rounded-2xl bg-surface p-3 shadow-[0_8px_28px_-10px_rgb(16_24_40/0.22)] md:grid-cols-[1.1fr_1.3fr_auto] md:items-center md:gap-0 md:p-2.5"
          @submit.prevent="submit"
        >
          <UiSelect
            v-model="category"
            :label="t('search.service')"
            :placeholder="t('home.chooseService')"
            :options="categoryOptions"
            class="hero-field md:border-r md:border-line md:pr-2"
          />
          <div class="hero-field relative md:pl-2">
            <MapPin class="pointer-events-none absolute bottom-[10px] left-3 z-10 size-5 text-muted md:left-5" aria-hidden="true" />
            <UiCombobox v-model="location" :label="t('home.locationLabel')" :placeholder="t('search.anyLocation')" :options="locationOptions" clearable class="[&_input]:pl-10" />
          </div>
          <UiButton type="submit" size="lg" class="mt-1 md:ml-2 md:mt-0 md:min-h-[52px] md:px-7">
            <Search class="size-5" aria-hidden="true" />{{ t('search.submit') }}
          </UiButton>
        </form>
      </div>

      <span v-if="isDemoImage && config.public.demoMode" class="absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-xs text-white">{{ t('home.demoPhoto') }}</span>
    </div>

    <ul class="mt-5 grid grid-cols-2 gap-3 md:mt-6 md:grid-cols-4 md:gap-4" :aria-label="t('home.categoriesLabel')">
      <li v-for="c in categories ?? []" :key="c.id">
        <NuxtLink
          :to="localePath({ path: '/professionals', query: { category: c.slug } })"
          class="group flex h-full items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3.5 transition-shadow hover:shadow-[var(--shadow-card)] md:gap-4 md:p-5"
        >
          <span class="flex size-11 shrink-0 items-center justify-center rounded-full md:size-14" :class="tint[c.slug] ?? 'bg-primary-soft text-primary'">
            <AppCategoryIcon :slug="c.slug" class="size-5 md:size-6" />
          </span>
          <span class="min-w-0 flex-1 text-[0.9375rem] font-medium leading-snug md:text-base">{{ tx(c.name) }}</span>
          <ChevronRight class="hidden size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 sm:block" aria-hidden="true" />
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
/* Borderless fields inside the search pill; labels become small captions. */
.hero-field :deep(.field-label) {
  margin: 0 0 2px 12px;
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--color-muted);
}
.hero-field :deep(.control) {
  border-color: transparent;
  box-shadow: none;
  min-height: 40px;
  padding-top: 6px;
  padding-bottom: 6px;
}
.hero-field :deep(.control:hover) {
  background: var(--color-bg);
}
.hero-field :deep(.control:focus) {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgb(23 107 97 / 0.16);
}
@media (max-width: 767px) {
  .hero-field :deep(.control) {
    border-color: var(--color-line);
  }
}
</style>
