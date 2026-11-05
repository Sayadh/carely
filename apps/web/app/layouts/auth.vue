<script setup lang="ts">
const localePath = useLocalePath();
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <AppDemoBanner />
    <header class="container-page flex h-16 items-center justify-between">
      <NuxtLink :to="localePath('/')"><AppLogo /></NuxtLink>
      <AppLanguageSwitcher />
    </header>
    <main id="main" class="flex flex-1 items-start justify-center px-4 py-8 md:py-16"><slot /></main>
  </div>
</template>
