<script setup lang="ts">
import { Send } from 'lucide-vue-next';

/**
 * Always-visible "Call us" + "Send request" bar at the bottom of public pages. The call button appears once
 * NUXT_PUBLIC_SUPPORT_PHONE is set. "Send request" uses the page's own form when it has one (profile, request page),
 * otherwise opens the general request page.
 */
const { t } = useI18n();
const localePath = useLocalePath();
const phone = useSupportPhone();
const { handler } = useRequestAction();

function send() {
  if (handler.value) handler.value();
  else navigateTo(localePath('/request'));
}
const btn = 'whitespace-nowrap !px-3 sm:!px-5 md:min-h-12 md:w-auto';
</script>

<template>
  <div class="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur" role="region" :aria-label="t('lead.pageTitle')">
    <div class="container-page flex items-center gap-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] md:py-3">
      <p class="hidden flex-1 text-[0.9375rem] text-[#344054] md:block">{{ t('actionBar.text') }}</p>
      <div class="grid flex-1 gap-2 md:flex md:flex-none" :class="phone ? 'grid-cols-2' : 'grid-cols-1'">
        <AppCallButton v-if="phone" :show-number="false" size="md" block :class="btn" />
        <UiButton size="md" block :class="btn" @click="send"><Send class="size-4" aria-hidden="true" />{{ t('request.submit') }}</UiButton>
      </div>
    </div>
  </div>
  <!-- Keeps the end of the page (footer) reachable above the bar. -->
  <div class="h-[68px] md:h-[76px]" aria-hidden="true" />
</template>
