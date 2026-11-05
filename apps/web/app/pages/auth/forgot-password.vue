<script setup lang="ts">
import { forgotPasswordSchema } from '@carely/shared';
definePageMeta({ layout: 'auth' });
const { t } = useI18n();
const localePath = useLocalePath();
const api = useApi();
const errMsg = useErrorMessage();
const { errors, fromZod, clear } = useFieldErrors();
const email = ref('');
const busy = ref(false);
const sent = ref(false);
const formError = ref('');
useSeoMeta({ title: () => t('auth.forgotTitle'), robots: 'noindex' });

async function submit() {
  clear();
  formError.value = '';
  const parsed = forgotPasswordSchema.safeParse({ email: email.value });
  if (!parsed.success) return fromZod(parsed.error.issues);
  busy.value = true;
  try {
    await api('/auth/forgot-password', { method: 'POST', body: parsed.data });
    sent.value = true;
  } catch (e) {
    formError.value = errMsg(e);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="w-full max-w-md">
    <UiCard>
      <h1 class="text-2xl font-semibold">{{ t('auth.forgotTitle') }}</h1>
      <template v-if="sent">
        <!-- Same message whether or not the account exists. -->
        <UiAlert tone="success" class="mt-4">{{ t('auth.forgotSent') }}</UiAlert>
        <UiButton variant="secondary" block class="mt-6" :to="localePath('/auth/login')">{{ t('auth.backToLogin') }}</UiButton>
      </template>
      <form v-else class="mt-6 space-y-4" novalidate @submit.prevent="submit">
        <p class="text-muted">{{ t('auth.forgotText') }}</p>
        <UiInput v-model="email" type="email" autocomplete="email" :label="t('auth.email')" :error="errors.email" required />
        <p v-if="formError" class="field-error" role="alert">{{ formError }}</p>
        <UiButton type="submit" block size="lg" :loading="busy">{{ t('auth.forgotSubmit') }}</UiButton>
        <NuxtLink :to="localePath('/auth/login')" class="block text-center text-sm font-medium text-primary hover:underline">{{ t('auth.backToLogin') }}</NuxtLink>
      </form>
    </UiCard>
  </div>
</template>
