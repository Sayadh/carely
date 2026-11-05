<script setup lang="ts">
import { loginSchema, type SessionUserDto } from '@carely/shared';
definePageMeta({ layout: 'auth', middleware: 'guest' });
const { t } = useI18n();
const localePath = useLocalePath();
const route = useRoute();
const api = useApi();
const auth = useAuthStore();
const errMsg = useErrorMessage();
const { errors, fromZod, set, clear } = useFieldErrors();
const form = reactive({ email: '', password: '' });
const busy = ref(false);
const formError = ref('');
useSeoMeta({ title: () => t('auth.loginTitle'), robots: 'noindex' });

async function submit() {
  clear();
  formError.value = '';
  const parsed = loginSchema.safeParse(form);
  if (!parsed.success) return fromZod(parsed.error.issues);
  busy.value = true;
  try {
    const user = await api<SessionUserDto>('/auth/login', { method: 'POST', body: parsed.data });
    auth.set(user);
    await auth.loadFavorites();
    await navigateTo(safeRedirect(route.query.redirect, localePath(user.isAdmin ? '/admin' : '/account')));
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
      <h1 class="text-2xl font-semibold">{{ t('auth.loginTitle') }}</h1>
      <p class="mt-1 text-muted">{{ t('auth.loginSubtitle') }}</p>
      <UiAlert v-if="route.query.reason === 'request'" tone="info" class="mt-4">{{ t('auth.requestReason') }}</UiAlert>
      <form class="mt-6 space-y-4" novalidate @submit.prevent="submit">
        <UiInput v-model="form.email" type="email" autocomplete="email" :label="t('auth.email')" :error="errors.email" required />
        <UiInput v-model="form.password" type="password" autocomplete="current-password" :label="t('auth.password')" :error="errors.password" required />
        <div class="text-right text-sm"><NuxtLink :to="localePath('/auth/forgot-password')" class="font-medium text-primary hover:underline">{{ t('auth.forgot') }}</NuxtLink></div>
        <p v-if="formError" class="field-error" role="alert">{{ formError }}</p>
        <UiButton type="submit" block size="lg" :loading="busy">{{ t('auth.loginSubmit') }}</UiButton>
      </form>
    </UiCard>
    <p class="mt-5 text-center text-[0.9375rem] text-muted">
      {{ t('auth.noAccount') }}
      <NuxtLink :to="localePath({ path: '/auth/register', query: route.query })" class="font-medium text-primary hover:underline">{{ t('auth.registerLink') }}</NuxtLink>
    </p>
  </div>
</template>
