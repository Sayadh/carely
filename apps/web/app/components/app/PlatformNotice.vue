<script setup lang="ts">
import { Info } from 'lucide-vue-next';

/** Short liability notice on professional profiles; the full wording lives in the Terms of use. */
const { t } = useI18n();
const localePath = useLocalePath();
</script>

<template>
  <p class="flex gap-2 text-sm leading-relaxed text-muted">
    <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
    <span>
      <i18n-t keypath="profile.platformNotice" scope="global">
        <template #terms><NuxtLink :to="localePath('/terms')" class="font-medium text-primary hover:underline">{{ t('profile.platformNoticeTerms') }}</NuxtLink></template>
      </i18n-t>
    </span>
  </p>
</template>
