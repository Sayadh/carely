<script setup lang="ts">
const { t, tm, rt } = useI18n();
const localePath = useLocalePath();
useSeoMeta({ title: () => t('howPage.title'), description: () => t('howPage.lead') });
const customer = computed(() => (tm('howPage.customerSteps') as any[]).map((s) => ({ title: rt(s.title), text: rt(s.text) })));
const pro = computed(() => (tm('howPage.proSteps') as any[]).map((s) => ({ title: rt(s.title), text: rt(s.text) })));
</script>

<template>
  <AppContentPage :title="t('howPage.title')" :lead="t('howPage.lead')">
    <div class="grid gap-10 lg:grid-cols-2">
      <section v-for="(list, key) in { customer, pro }" :key="key" :aria-labelledby="`h-${key}`">
        <h2 :id="`h-${key}`" class="text-xl font-semibold">{{ t(`howPage.${key}Title`) }}</h2>
        <ol class="mt-4 space-y-3">
          <li v-for="(s, i) in list" :key="i" class="card flex gap-4 p-5">
            <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary">{{ i + 1 }}</span>
            <div><h3 class="font-semibold">{{ s.title }}</h3><p class="mt-1 text-[#475467]">{{ s.text }}</p></div>
          </li>
        </ol>
      </section>
    </div>
    <div class="mt-10 flex flex-wrap gap-3">
      <UiButton :to="localePath('/professionals')">{{ t('search.submit') }}</UiButton>
      <UiButton variant="soft" :to="localePath('/request')">{{ t('home.match.contact') }}</UiButton>
      <AppCallButton />
      <UiButton variant="secondary" :to="localePath('/become-a-professional')">{{ t('nav.becomePro') }}</UiButton>
    </div>
  </AppContentPage>
</template>
