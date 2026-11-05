<script setup lang="ts">
import { updateAccountSchema, changePasswordSchema, type SessionUserDto } from '@carely/shared';
definePageMeta({ layout: 'dashboard', section: 'account', middleware: 'auth' });
const { t } = useI18n();
const api = useApi();
const auth = useAuthStore();
const toast = useToast();
const errMsg = useErrorMessage();
const switchLocalePath = useSwitchLocalePath();
useSeoMeta({ title: () => t('account.nav.settings'), robots: 'noindex' });

const profile = reactive({ name: auth.user?.name ?? '', phone: auth.user?.phone ?? '', locale: auth.user?.locale ?? 'hy' });
const pf = useFieldErrors();
const saving = ref(false);
async function saveProfile() {
  pf.clear();
  const parsed = updateAccountSchema.safeParse(profile);
  if (!parsed.success) return pf.fromZod(parsed.error.issues);
  saving.value = true;
  try {
    const u = await api<SessionUserDto>('/auth/account', { method: 'PATCH', body: profile });
    auth.set(u);
    toast.success(t('settings.saved'));
  } catch (e) {
    pf.set(e);
    toast.error(errMsg(e));
  } finally {
    saving.value = false;
  }
}

const pw = reactive({ currentPassword: '', newPassword: '' });
const pe = useFieldErrors();
const changing = ref(false);
async function changePassword() {
  pe.clear();
  const parsed = changePasswordSchema.safeParse(pw);
  if (!parsed.success) return pe.fromZod(parsed.error.issues);
  changing.value = true;
  try {
    await api('/auth/change-password', { method: 'POST', body: pw });
    pw.currentPassword = '';
    pw.newPassword = '';
    toast.success(t('settings.passwordChanged'));
  } catch (e) {
    pe.set(e);
    toast.error(errMsg(e));
  } finally {
    changing.value = false;
  }
}
</script>

<template>
  <div class="max-w-2xl space-y-6">
    <AppPageHeader :title="t('account.nav.settings')" />
    <UiCard>
      <h2 class="text-lg font-semibold">{{ t('settings.profile') }}</h2>
      <form class="mt-4 space-y-4" novalidate @submit.prevent="saveProfile">
        <UiInput v-model="profile.name" :label="t('auth.name')" :error="pf.errors.value.name" required />
        <UiInput :model-value="auth.user?.email" :label="t('auth.email')" disabled :help="t('settings.emailHelp')" />
        <UiInput v-model="profile.phone" type="tel" :label="t('auth.phone')" :error="pf.errors.value.phone" :help="t('auth.phoneHelp')" />
        <UiSelect
          v-model="profile.locale"
          :label="t('settings.language')"
          :help="t('settings.languageHelp')"
          :options="[
            { value: 'hy', label: 'Հայերեն' },
            { value: 'ru', label: 'Русский' },
            { value: 'en', label: 'English' },
          ]"
        />
        <UiButton type="submit" :loading="saving">{{ t('common.save') }}</UiButton>
      </form>
    </UiCard>
    <UiCard>
      <h2 class="text-lg font-semibold">{{ t('settings.password') }}</h2>
      <form class="mt-4 space-y-4" novalidate @submit.prevent="changePassword">
        <UiInput v-model="pw.currentPassword" type="password" autocomplete="current-password" :label="t('settings.currentPassword')" :error="pe.errors.value.currentPassword" />
        <UiInput v-model="pw.newPassword" type="password" autocomplete="new-password" :label="t('auth.newPassword')" :help="t('auth.passwordHelp')" :error="pe.errors.value.newPassword" />
        <UiButton type="submit" variant="secondary" :loading="changing">{{ t('settings.changePassword') }}</UiButton>
      </form>
    </UiCard>
  </div>
</template>
