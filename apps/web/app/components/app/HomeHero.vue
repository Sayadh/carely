<script setup lang="ts">
import { Search, MapPin } from 'lucide-vue-next';

/**
 * Homepage hero: a photo slideshow on the right fading into the text area (desktop), as a background strip on
 * mobile. One slide per category — built-in photo `public/images/hero/<slug>.webp`, overridable per category via
 * NUXT_PUBLIC_HERO_IMAGE_<CATEGORY> (or for all slides via NUXT_PUBLIC_HERO_IMAGE). Heading always sits on a
 * readable light area.
 */
const emit = defineEmits<{ search: [q: { category?: string; location?: string }] }>();
const { t } = useI18n();
const config = useRuntimeConfig();
const localePath = useLocalePath();
const { categories, load } = useTaxonomy();
const { tx } = useFormat();
await load().catch(() => undefined);

const category = ref<string>();
const location = ref<string>();
const locationOptions = useLocationOptions();
const categoryOptions = computed(() => (categories.value ?? []).map((c) => ({ value: c.slug, label: tx(c.name) })));
function submit() {
  emit('search', { category: category.value || undefined, location: location.value || undefined });
}

// Calm, low-saturation tints — one per category, consistent everywhere they appear.
const tint: Record<string, string> = {
  childcare: 'bg-[#fde6da]',
  'elderly-care': 'bg-[#dff0e5]',
  'patient-care': 'bg-[#e1ebf6]',
  nursing: 'bg-[#e4e2f7]',
  'pet-care': 'bg-[#fcf0cc]',
  'disability-care': 'bg-[#f7e0ec]',
  'personal-assistance': 'bg-[#dceff2]',
  'home-help': 'bg-[#eee6da]',
};

const heroImages = config.public.heroImages as Record<string, string>;
const slides = computed(() =>
  (categories.value ?? []).map((c) => ({
    slug: c.slug,
    name: c.name,
    image: heroImages[c.slug] || config.public.heroImage || `/images/hero/${c.slug}.webp`,
  })),
);

// ── Autoplay: pauses on hover/focus and is skipped entirely for prefers-reduced-motion; dots always work. ──
const active = ref(0);
const paused = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;
function go(i: number) {
  active.value = (i + slides.value.length) % slides.value.length;
}
onMounted(() => {
  if (slides.value.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  timer = setInterval(() => {
    if (!paused.value && !document.hidden) go(active.value + 1);
  }, 5500);
});
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <section aria-labelledby="hero-h">
    <!-- Full-bleed hero -->
    <div
      class="relative isolate overflow-hidden bg-[#f6f3ef]"
      @mouseenter="paused = true"
      @mouseleave="paused = false"
      @focusin="paused = true"
      @focusout="paused = false"
    >
      <!-- Photo stack: one slide per category, cross-fading -->
      <div class="absolute inset-x-0 top-0 -z-20 h-[340px] w-full overflow-hidden md:inset-y-0 md:left-auto md:right-0 md:h-full md:w-[66%]">
        <div
          v-for="(s, i) in slides"
          :key="s.slug"
          class="absolute inset-0 transition-opacity duration-700 ease-in-out"
          :class="i === active ? 'opacity-100' : 'opacity-0'"
          :aria-hidden="i !== active"
        >
          <img
            :src="s.image"
            :alt="tx(s.name)"
            width="966"
            height="572"
            :fetchpriority="i === 0 ? 'high' : undefined"
            class="size-full object-cover object-[60%_30%] md:object-[center_35%]"
          />
        </div>
      </div>
      <div class="absolute inset-x-0 top-0 -z-10 h-[341px] bg-gradient-to-t from-[#f6f3ef] from-[12%] via-[#f6f3ef]/45 via-[45%] to-transparent md:hidden" aria-hidden="true" />
      <div class="absolute inset-y-0 left-0 -z-10 hidden w-[62%] bg-gradient-to-r from-[#f6f3ef] from-[52%] to-transparent md:block" aria-hidden="true" />

      <!-- Current category's name + slide dots, over the photo. Pinned to its top on mobile (the heading sits
           lower, over the photo's bottom fade) and to its bottom on desktop (the heading is in the left column). -->
      <div
        class="absolute inset-x-0 top-0 z-10 flex h-[340px] items-start justify-between gap-2 px-4 pt-3 md:inset-y-0 md:left-auto md:right-0 md:h-full md:w-[66%] md:items-end md:px-5 md:pb-5 md:pt-0"
      >
        <p class="truncate rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white md:text-sm">{{ tx(slides[active]?.name) }}</p>
        <div class="flex shrink-0 items-center gap-1.5">
          <button
            v-for="(s, i) in slides"
            :key="s.slug"
            type="button"
            :aria-current="i === active ? 'true' : undefined"
            :aria-label="tx(s.name)"
            class="h-1.5 rounded-full bg-white/50 transition-all hover:bg-white/80"
            :class="i === active ? 'w-5 !bg-white' : 'w-1.5'"
            @click="go(i)"
          />
        </div>
      </div>

      <div class="container-page flex min-h-[580px] flex-col justify-end pb-16 pt-64 md:min-h-[560px] md:justify-center md:pb-28 md:pt-16">
        <h1 id="hero-h" class="max-w-[11.5em] text-[2.15rem] font-bold leading-[1.12] tracking-tight text-ink md:text-[3.4rem]">{{ t('home.heroTitle') }}</h1>
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
    </div>

    <!-- Category blocks on a panel overlapping the bottom of the photo -->
    <div class="container-page relative z-10 -mt-8 md:-mt-14">
      <ul class="grid grid-cols-2 gap-2 rounded-[20px] bg-surface p-2 sm:gap-3 sm:p-3 shadow-[0_10px_30px_-12px_rgb(16_24_40/0.18)] md:gap-4 md:p-5 lg:grid-cols-4" :aria-label="t('home.categoriesLabel')">
        <li v-for="c in categories ?? []" :key="c.id">
          <NuxtLink
            :to="localePath({ path: '/professionals', query: { category: c.slug } })"
            class="group flex h-full flex-col items-start gap-2.5 rounded-[var(--radius-card)] border border-line bg-surface px-2.5 py-3 transition-all hover:border-line-strong hover:shadow-[var(--shadow-card)] sm:p-3 md:p-4"
          >
            <!-- Icon above the name: long Armenian names (e.g. disability care) need the full card width to wrap at word boundaries. -->
            <span class="flex size-11 shrink-0 items-center justify-center rounded-full text-ink md:size-14" :class="tint[c.slug] ?? 'bg-primary-soft'">
              <AppCategoryIcon :slug="c.slug" class="size-7 md:size-9" />
            </span>
            <span class="w-full min-w-0 flex-1 text-[0.8125rem] font-medium leading-snug [overflow-wrap:anywhere] min-[400px]:text-sm sm:text-[0.9375rem] md:text-base">{{ tx(c.name) }}</span>
          </NuxtLink>
        </li>
      </ul>
    </div>
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
