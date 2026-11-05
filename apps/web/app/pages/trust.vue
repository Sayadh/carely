<script setup lang="ts">
import { ShieldCheck, BadgeCheck, CircleSlash, Flag } from 'lucide-vue-next';
const { t } = useI18n();
const localePath = useLocalePath();
useSeoMeta({ title: () => t('trustPage.title'), description: () => t('trustPage.lead') });
</script>

<template>
  <AppContentPage :title="t('trustPage.title')" :lead="t('trustPage.lead')" narrow>
    <div class="space-y-4">
      <UiCard>
        <h2 class="flex items-center gap-2 text-lg font-semibold"><ShieldCheck class="size-5 text-primary" aria-hidden="true" />{{ t('verification.kind.IDENTITY') }}</h2>
        <p class="mt-2 text-[#475467]">{{ t('trustPage.identity') }}</p>
      </UiCard>
      <UiCard>
        <h2 class="flex items-center gap-2 text-lg font-semibold"><BadgeCheck class="size-5 text-success" aria-hidden="true" />{{ t('trustPage.qualTitle') }}</h2>
        <p class="mt-2 text-[#475467]">{{ t('trustPage.qual') }}</p>
        <ul class="mt-3 space-y-1.5 text-[0.9375rem]">
          <li v-for="k in ['NURSING_LICENSE', 'MEDICAL_EDUCATION', 'FIRST_AID', 'PEDAGOGY', 'VETERINARY']" :key="k"><strong>{{ t(`verification.kind.${k}`) }}</strong> — {{ t(`trustPage.kinds.${k}`) }}</li>
        </ul>
      </UiCard>
      <UiCard>
        <h2 class="flex items-center gap-2 text-lg font-semibold"><CircleSlash class="size-5 text-[#9a4a2a]" aria-hidden="true" />{{ t('trustPage.notTitle') }}</h2>
        <ul class="mt-2 list-disc space-y-1.5 pl-5 text-[#475467]">
          <li>{{ t('trustPage.not1') }}</li>
          <li>{{ t('trustPage.not2') }}</li>
          <li>{{ t('trustPage.not3') }}</li>
          <li>{{ t('trustPage.not4') }}</li>
        </ul>
      </UiCard>
      <UiCard>
        <h2 class="flex items-center gap-2 text-lg font-semibold"><Flag class="size-5 text-muted" aria-hidden="true" />{{ t('trustPage.tipsTitle') }}</h2>
        <ul class="mt-2 list-disc space-y-1.5 pl-5 text-[#475467]">
          <li>{{ t('trustPage.tip1') }}</li>
          <li>{{ t('trustPage.tip2') }}</li>
          <li>{{ t('trustPage.tip3') }}</li>
        </ul>
        <UiButton variant="secondary" class="mt-4" :to="localePath({ path: '/contact', query: { topic: 'SAFETY' } })">{{ t('trustPage.report') }}</UiButton>
      </UiCard>
    </div>
  </AppContentPage>
</template>
