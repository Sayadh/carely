<script setup lang="ts">
import { CheckCircle2 } from 'lucide-vue-next';
const { t, tm, rt } = useI18n();
const localePath = useLocalePath();
const auth = useAuthStore();
const api = useApi();
const toast = useToast();
const errMsg = useErrorMessage();
const busy = ref(false);
useSeoMeta({ title: () => t('becomePage.title'), description: () => t('becomePage.lead') });
const points = computed(() => (tm('becomePage.points') as any[]).map((p) => rt(p)));
const steps = computed(() => (tm('howPage.proSteps') as any[]).map((s) => ({ title: rt(s.title), text: rt(s.text) })));

async function start() {
  if (!auth.user) return navigateTo({ path: localePath('/auth/register'), query: { redirect: localePath('/become-a-professional') } });
  if (auth.professional) return navigateTo(localePath('/pro'));
  busy.value = true;
  try {
    await api('/me/professional', { method: 'POST' });
    await auth.fetch();
    await navigateTo(localePath('/pro/onboarding'));
  } catch (e) {
    toast.error(errMsg(e));
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <AppContentPage :title="t('becomePage.title')" :lead="t('becomePage.lead')">
    <div class="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <ul class="space-y-3">
          <li v-for="(p, i) in points" :key="i" class="flex gap-3"><CheckCircle2 class="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><span class="text-[#344054]">{{ p }}</span></li>
        </ul>
        <h2 class="mt-10 text-xl font-semibold">{{ t('becomePage.stepsTitle') }}</h2>
        <ol class="mt-4 space-y-3">
          <li v-for="(s, i) in steps" :key="i" class="card flex gap-4 p-4">
            <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary">{{ i + 1 }}</span>
            <div><p class="font-semibold">{{ s.title }}</p><p class="text-[0.9375rem] text-[#475467]">{{ s.text }}</p></div>
          </li>
        </ol>
      </div>
      <UiCard class="self-start lg:sticky lg:top-24">
        <h2 class="text-lg font-semibold">{{ t('becomePage.ctaTitle') }}</h2>
        <p class="mt-2 text-[#475467]">{{ t('becomePage.ctaText') }}</p>
        <UiButton block size="lg" class="mt-5" :loading="busy" @click="start">{{ auth.professional ? t('nav.proDashboard') : t('becomePage.start') }}</UiButton>
        <p class="mt-3 text-sm text-muted">{{ t('becomePage.noFees') }}</p>
      </UiCard>
    </div>
  </AppContentPage>
</template>
