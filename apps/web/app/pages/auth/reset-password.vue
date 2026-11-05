<script setup lang="ts">
import { resetPasswordSchema } from '@carely/shared';
definePageMeta({ layout: 'auth' });
const { t } = useI18n();
const localePath = useLocalePath();
const route = useRoute();
const api = useApi();
const errMsg = useErrorMessage();
const { errors, fromZod, set, clear } = useFieldErrors();
const password = ref('');
const busy = ref(false);
const done = ref(false);
const formError = ref('');
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''));
useSeoMeta({ title: () => t('auth.resetTitle'), robots: 'noindex', referrer: 'no-referrer' });

async function submit() {
  clear();
  formError.value = '';
  const parsed = resetPasswordSchema.safeParse({ token: token.value, password: password.value });
  if (!parsed.success) return fromZod(parsed.error.issues);
  busy.value = true;
  try {
    await api('/auth/reset-password', { method: 'POST', body: parsed.data });
    done.value = true;
  } catch (e) {
    set(e);
    formError.value = errMsg(e);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="w-full max-w-md">
    <UiCard>
      <h1 class="text-2xl font-semibold">{{ t('auth.resetTitle') }}</h1>
      <UiAlert v-if="!token" tone="danger" class="mt-4">{{ t('errors.RESET_TOKEN_INVALID') }}</UiAlert>
      <template v-else-if="done">
        <UiAlert tone="success" class="mt-4">{{ t('auth.resetDone') }}</UiAlert>
        <UiButton block class="mt-6" :to="localePath('/auth/login')">{{ t('auth.loginSubmit') }}</UiButton>
      </template>
      <form v-else class="mt-6 space-y-4" novalidate @submit.prevent="submit">
        <UiInput v-model="password" type="password" autocomplete="new-password" :label="t('auth.newPassword')" :help="t('auth.passwordHelp')" :error="errors.password" required />
        <p v-if="formError" class="field-error" role="alert">{{ formError }}</p>
        <UiButton type="submit" block size="lg" :loading="busy">{{ t('auth.resetSubmit') }}</UiButton>
      </form>
    </UiCard>
  </div>
</template>
