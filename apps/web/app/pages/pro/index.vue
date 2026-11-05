<script setup lang="ts">
import { ArrowRight, Handshake } from 'lucide-vue-next';
definePageMeta({ layout: 'dashboard', section: 'pro', middleware: 'auth' });
const { t } = useI18n();
const localePath = useLocalePath();
const { profile, load } = useProProfile();
await load();
if (!profile.value) await navigateTo(localePath('/become-a-professional'));
useSeoMeta({ title: () => t('nav.proDashboard'), robots: 'noindex' });

const statusTone = computed(() => ({ DRAFT: 'neutral', PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger', SUSPENDED: 'danger' })[profile.value?.status ?? 'DRAFT'] as any);
const missing = computed(() => (profile.value ? Object.entries(profile.value.completeness).filter(([, ok]) => !ok).length : 0));
</script>

<template>
  <div v-if="profile" class="space-y-6">
    <AppPageHeader :title="t('nav.proDashboard')">
      <UiButton v-if="profile.status === 'APPROVED'" variant="secondary" :to="localePath(`/professionals/${profile.slug}`)">{{ t('onboarding.viewPublic') }}</UiButton>
    </AppPageHeader>

    <UiCard>
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-sm text-muted">{{ t('pro.profileStatus') }}</p>
          <div class="mt-1 flex items-center gap-2"><UiBadge :tone="statusTone">{{ t(`profileStatus.${profile.status}`) }}</UiBadge></div>
          <p class="mt-3 max-w-xl text-[#475467]">{{ t(`pro.statusText.${profile.status}`) }}</p>
          <p v-if="profile.status === 'REJECTED' && profile.rejectionReason" class="mt-2 text-danger">{{ t('onboarding.rejectedTitle') }}: {{ profile.rejectionReason }}</p>
        </div>
        <UiButton v-if="profile.status === 'DRAFT' || profile.status === 'REJECTED'" :to="localePath('/pro/onboarding')">
          {{ missing ? t('pro.continueOnboarding') : t('onboarding.submit') }} <ArrowRight class="size-4" aria-hidden="true" />
        </UiButton>
      </div>
    </UiCard>

    <!-- Client requests go to the Carely team, which contacts the professional directly. -->
    <UiCard>
      <h2 class="flex items-center gap-2 text-lg font-semibold"><Handshake class="size-5 text-primary" aria-hidden="true" />{{ t('pro.howWorkTitle') }}</h2>
      <p class="mt-2 max-w-2xl text-[#475467]">{{ t('pro.howWorkText') }}</p>
      <div class="mt-4 flex flex-wrap gap-2">
        <UiButton variant="secondary" :to="localePath('/pro/availability')">{{ t('pro.nav.availability') }}</UiButton>
        <UiButton variant="secondary" :to="localePath('/pro/profile')">{{ t('pro.nav.profile') }}</UiButton>
      </div>
    </UiCard>
  </div>
</template>
