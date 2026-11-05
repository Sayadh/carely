<script setup lang="ts">
const localePath = useLocalePath();
const { t } = useI18n();
const { categories, load } = useTaxonomy();
const { tx } = useFormat();
await load().catch(() => undefined);
</script>

<template>
  <footer class="mt-24 border-t border-line bg-surface">
    <div class="container-page grid gap-10 py-12 md:grid-cols-4">
      <div>
        <AppLogo />
        <p class="mt-3 max-w-xs text-[0.9375rem] text-muted">{{ t('footer.about') }}</p>
        <AppCallButton size="md" class="mt-4" />
      </div>
      <nav :aria-label="t('footer.services')">
        <h2 class="mb-3 text-sm font-semibold">{{ t('footer.services') }}</h2>
        <ul class="space-y-2 text-[0.9375rem] text-[#475467]">
          <li v-for="c in categories ?? []" :key="c.id">
            <NuxtLink :to="localePath({ path: '/professionals', query: { category: c.slug } })" class="hover:text-primary">{{ tx(c.name) }}</NuxtLink>
          </li>
        </ul>
      </nav>
      <nav :aria-label="t('footer.company')">
        <h2 class="mb-3 text-sm font-semibold">{{ t('footer.company') }}</h2>
        <ul class="space-y-2 text-[0.9375rem] text-[#475467]">
          <li><NuxtLink :to="localePath('/about')" class="hover:text-primary">{{ t('nav.about') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('/how-it-works')" class="hover:text-primary">{{ t('nav.howItWorks') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('/trust')" class="hover:text-primary">{{ t('nav.verification') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('/become-a-professional')" class="hover:text-primary">{{ t('nav.becomePro') }}</NuxtLink></li>
        </ul>
      </nav>
      <nav :aria-label="t('footer.help')">
        <h2 class="mb-3 text-sm font-semibold">{{ t('footer.help') }}</h2>
        <ul class="space-y-2 text-[0.9375rem] text-[#475467]">
          <li><NuxtLink :to="localePath('/request')" class="hover:text-primary">{{ t('lead.pageTitle') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('/faq')" class="hover:text-primary">{{ t('nav.faq') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('/contact')" class="hover:text-primary">{{ t('nav.contact') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('/terms')" class="hover:text-primary">{{ t('nav.terms') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('/privacy')" class="hover:text-primary">{{ t('nav.privacy') }}</NuxtLink></li>
        </ul>
      </nav>
    </div>
    <div class="border-t border-line">
      <div class="container-page flex flex-col gap-2 py-5 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <p>© {{ new Date().getFullYear() }} Carely</p>
        <p>{{ t('footer.disclaimer') }}</p>
      </div>
    </div>
  </footer>
</template>
