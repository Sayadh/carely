<script setup lang="ts">
import { Handshake, Scale } from 'lucide-vue-next';

/** General request to the Carely team: describe the need, we call back and introduce a suitable professional. */
const { t } = useI18n();
const route = useRoute();
const localePath = useLocalePath();
const category = typeof route.query.category === 'string' ? route.query.category : undefined;
const form = ref<HTMLElement | null>(null);
useRequestAction().register(() => focusForm(form.value));
useSeoMeta({ title: () => t('lead.pageTitle'), description: () => t('home.match.text') });
</script>

<template>
  <AppContentPage :title="t('home.match.title')" :lead="t('home.match.text')">
    <div class="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <div ref="form" class="card p-5 md:p-7">
        <AppRequestPanel :category="category" />
      </div>
      <aside class="space-y-3">
        <div class="flex gap-4 rounded-[var(--radius-card)] bg-surface p-4">
          <Handshake class="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
          <p class="text-[0.9375rem] text-[#344054]">{{ t('home.match.agreement') }}</p>
        </div>
        <div class="flex gap-4 rounded-[var(--radius-card)] bg-surface p-4">
          <Scale class="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
          <p class="text-[0.9375rem] text-[#344054]">{{ t('home.match.responsibility') }} <strong class="font-semibold text-ink">{{ t('home.match.responsibilityOwner') }}</strong></p>
        </div>
        <NuxtLink :to="localePath('/terms')" class="inline-block px-1 text-sm font-medium text-primary hover:underline">{{ t('home.match.terms') }}</NuxtLink>
      </aside>
    </div>
  </AppContentPage>
</template>
