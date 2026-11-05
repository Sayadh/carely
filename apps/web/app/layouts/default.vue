<template>
  <div class="flex min-h-screen flex-col">
    <AppDemoBanner />
    <AppHeader />
    <main id="main" class="flex-1" tabindex="-1"><slot /></main>
    <AppFooter />
    <AppActionBar />
  </div>
</template>
