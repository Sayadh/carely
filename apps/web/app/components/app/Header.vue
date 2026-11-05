<script setup lang="ts">
import { Menu } from 'lucide-vue-next';
const auth = useAuthStore();
const localePath = useLocalePath();
const { t } = useI18n();
const mobileOpen = ref(false);
const route = useRoute();
watch(() => route.fullPath, () => (mobileOpen.value = false));
const links = computed(() => [
  { to: localePath('/professionals'), label: t('nav.professionals') },
  { to: localePath('/how-it-works'), label: t('nav.howItWorks') },
  { to: localePath('/trust'), label: t('nav.verification') },
]);
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
    <a href="#main" class="sr-only-focusable absolute left-4 top-2 z-50 rounded-lg bg-primary px-3 py-2 text-white">{{ t('nav.skipToContent') }}</a>
    <div class="container-page flex h-16 items-center gap-4">
      <NuxtLink :to="localePath('/')" class="shrink-0" :aria-label="t('nav.home')"><AppLogo /></NuxtLink>
      <nav class="ml-6 hidden items-center gap-1 lg:flex" :aria-label="t('nav.main')">
        <NuxtLink v-for="l in links" :key="l.to" :to="l.to" class="rounded-lg px-3 py-2 text-[0.9375rem] text-[#344054] hover:bg-bg hover:text-ink" active-class="text-primary font-medium">
          {{ l.label }}
        </NuxtLink>
      </nav>
      <div class="ml-auto flex items-center gap-1 md:gap-2">
        <AppLanguageSwitcher class="hidden md:block" />
        <template v-if="auth.user">
          <AppUserMenu />
        </template>
        <template v-else>
          <span class="hidden sm:block"><UiButton variant="ghost" :to="localePath('/auth/login')">{{ t('nav.login') }}</UiButton></span>
        </template>
        <span v-if="!auth.professional" class="hidden md:block"><UiButton variant="soft" :to="localePath('/become-a-professional')">{{ t('nav.becomePro') }}</UiButton></span>
        <button type="button" class="inline-flex size-11 items-center justify-center rounded-lg hover:bg-bg lg:hidden" :aria-label="t('nav.openMenu')" :aria-expanded="mobileOpen" @click="mobileOpen = true">
          <Menu class="size-6" aria-hidden="true" />
        </button>
      </div>
    </div>
    <UiDrawer v-model:open="mobileOpen" :title="t('nav.menu')">
      <nav class="flex flex-col" :aria-label="t('nav.main')">
        <NuxtLink v-for="l in links" :key="l.to" :to="l.to" class="flex min-h-12 items-center border-b border-line text-base">{{ l.label }}</NuxtLink>
        <NuxtLink :to="localePath('/faq')" class="flex min-h-12 items-center border-b border-line text-base">{{ t('nav.faq') }}</NuxtLink>
        <NuxtLink :to="localePath('/contact')" class="flex min-h-12 items-center border-b border-line text-base">{{ t('nav.contact') }}</NuxtLink>
      </nav>
      <div class="mt-6 flex flex-col gap-3">
        <UiButton v-if="!auth.user" :to="localePath('/auth/login')" variant="secondary" block>{{ t('nav.login') }}</UiButton>
        <UiButton v-if="!auth.professional" :to="localePath('/become-a-professional')" block>{{ t('nav.becomePro') }}</UiButton>
      </div>
      <div class="mt-6 border-t border-line pt-4">
        <p class="mb-2 text-sm text-muted">{{ t('nav.language') }}</p>
        <AppLanguageSwitcher />
      </div>
    </UiDrawer>
  </header>
</template>
