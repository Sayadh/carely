<script setup lang="ts">
import { supportInquirySchema, SUPPORT_TOPICS } from '@carely/shared';
const { t, locale } = useI18n();
const route = useRoute();
const api = useApi();
const auth = useAuthStore();
const errMsg = useErrorMessage();
const { errors, fromZod, set, clear } = useFieldErrors();
useSeoMeta({ title: () => t('contactPage.title'), description: () => t('contactPage.lead') });

const { state: form, clear: clearDraft } = useDraft('contact', () => ({
  name: auth.user?.name ?? '',
  email: auth.user?.email ?? '',
  topic: (typeof route.query.topic === 'string' && (SUPPORT_TOPICS as readonly string[]).includes(route.query.topic) ? route.query.topic : 'GENERAL') as (typeof SUPPORT_TOPICS)[number],
  message: '',
}));
const requestId = typeof route.query.requestId === 'string' ? route.query.requestId : undefined;
const busy = ref(false);
const stored = ref(false);
const formError = ref('');
async function submit() {
  clear();
  formError.value = '';
  const body = { ...form.value, requestId, locale: locale.value };
  const parsed = supportInquirySchema.safeParse(body);
  if (!parsed.success) return fromZod(parsed.error.issues);
  busy.value = true;
  try {
    await api('/support/inquiries', { method: 'POST', body });
    stored.value = true;
    clearDraft();
  } catch (e) {
    set(e);
    formError.value = errMsg(e);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <AppContentPage :title="t('contactPage.title')" :lead="t('contactPage.lead')" narrow>
    <UiCard>
      <!-- Truthful confirmation: the message was saved for the team; no email is claimed to be sent. -->
      <UiAlert v-if="stored" tone="success" :title="t('contactPage.storedTitle')">{{ t('contactPage.storedText') }}</UiAlert>
      <form v-else class="space-y-4" novalidate @submit.prevent="submit">
        <div class="grid gap-4 sm:grid-cols-2">
          <UiInput v-model="form.name" :label="t('auth.name')" autocomplete="name" :error="errors.name" required />
          <UiInput v-model="form.email" type="email" :label="t('auth.email')" autocomplete="email" :error="errors.email" required />
        </div>
        <UiSelect v-model="form.topic" :label="t('contactPage.topic')" :options="SUPPORT_TOPICS.map((s) => ({ value: s, label: t(`supportTopic.${s}`) }))" />
        <UiAlert v-if="requestId" tone="info">{{ t('contactPage.linkedRequest') }}</UiAlert>
        <UiTextarea v-model="form.message" :label="t('contactPage.message')" :help="t('contactPage.messageHelp')" :maxlength="3000" :rows="6" :error="errors.message" required />
        <p v-if="formError" class="field-error" role="alert">{{ formError }}</p>
        <UiButton type="submit" :loading="busy">{{ t('contactPage.submit') }}</UiButton>
      </form>
    </UiCard>
  </AppContentPage>
</template>
