<script setup lang="ts">
import { registerSchema, type SessionUserDto } from '@carely/shared';
definePageMeta({ layout: 'auth', middleware: 'guest' });
const { t, locale } = useI18n();
const localePath = useLocalePath();
const route = useRoute();
const api = useApi();
const auth = useAuthStore();
const errMsg = useErrorMessage();
const { errors, fromZod, set, clear } = useFieldErrors();
const form = reactive({ name: '', email: '', phone: '', password: '', acceptTerms: false });
const busy = ref(false);
const formError = ref('');
useSeoMeta({ title: () => t('auth.registerTitle'), robots: 'noindex' });

async function submit() {
  clear();
  formError.value = '';
  const parsed = registerSchema.safeParse({ ...form, locale: locale.value });
  if (!parsed.success) return fromZod(parsed.error.issues);
  busy.value = true;
  try {
    const user = await api<SessionUserDto>('/auth/register', { method: 'POST', body: { ...form, locale: locale.value } });
    auth.set(user);
    await navigateTo(safeRedirect(route.query.redirect, localePath('/account')));
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
      <h1 class="text-2xl font-semibold">{{ t('auth.registerTitle') }}</h1>
      <p class="mt-1 text-muted">{{ t('auth.registerSubtitle') }}</p>
      <form class="mt-6 space-y-4" novalidate @submit.prevent="submit">
        <UiInput v-model="form.name" autocomplete="name" :label="t('auth.name')" :error="errors.name" required />
        <UiInput v-model="form.email" type="email" autocomplete="email" :label="t('auth.email')" :error="errors.email" required />
        <UiInput v-model="form.phone" type="tel" autocomplete="tel" inputmode="tel" :label="t('auth.phone')" :help="t('auth.phoneHelp')" :error="errors.phone" placeholder="+374 XX XXXXXX" />
        <UiInput v-model="form.password" type="password" autocomplete="new-password" :label="t('auth.password')" :help="t('auth.passwordHelp')" :error="errors.password" required />
        <div>
          <label class="flex cursor-pointer items-start gap-3 text-[0.9375rem]">
            <input v-model="form.acceptTerms" type="checkbox" class="mt-1 size-5 shrink-0 accent-primary" :aria-invalid="!!errors.acceptTerms || undefined" />
            <span>
              <i18n-t keypath="auth.acceptTerms" scope="global">
                <template #terms><NuxtLink :to="localePath('/terms')" target="_blank" class="font-medium text-primary hover:underline">{{ t('nav.terms') }}</NuxtLink></template>
                <template #privacy><NuxtLink :to="localePath('/privacy')" target="_blank" class="font-medium text-primary hover:underline">{{ t('nav.privacy') }}</NuxtLink></template>
              </i18n-t>
            </span>
          </label>
          <p v-if="errors.acceptTerms" class="field-error">{{ errors.acceptTerms }}</p>
        </div>
        <p v-if="formError" class="field-error" role="alert">{{ formError }}</p>
        <UiButton type="submit" block size="lg" :loading="busy">{{ t('auth.registerSubmit') }}</UiButton>
      </form>
    </UiCard>
    <p class="mt-5 text-center text-[0.9375rem] text-muted">
      {{ t('auth.haveAccount') }}
      <NuxtLink :to="localePath({ path: '/auth/login', query: route.query })" class="font-medium text-primary hover:underline">{{ t('auth.loginLink') }}</NuxtLink>
    </p>
  </div>
</template>
