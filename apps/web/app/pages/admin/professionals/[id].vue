<script setup lang="ts">
import { FileText, ExternalLink, ArrowLeft } from 'lucide-vue-next';
definePageMeta({ layout: 'admin', middleware: 'admin' });
const { t } = useI18n();
const api = useApi();
const route = useRoute();
const toast = useToast();
const errMsg = useErrorMessage();
const localePath = useLocalePath();
const { tx, date, dateTime, price, weekday, minutes, ymd } = useFormat();
const id = String(route.params.id);
const { data: p, refresh } = await useAsyncData(`admin:pro:${id}`, () => api<any>(`/admin/professionals/${id}`));
useSeoMeta({ title: () => p.value?.displayName ?? t('admin.nav.applications'), robots: 'noindex' });

const busy = ref<string | null>(null);
async function run(path: string, body?: any, key = path) {
  busy.value = key;
  try {
    await api(`/admin/${path}`, { method: 'POST', body });
    toast.success(t('admin.saved'));
    await refresh();
    return true;
  } catch (e) {
    toast.error(errMsg(e));
    return false;
  } finally {
    busy.value = null;
  }
}
const reasonDialog = ref<null | 'reject' | 'suspend'>(null);
const reason = ref('');
async function submitReason() {
  if (reason.value.trim().length < 5) return toast.error(t('validation.required'));
  if (await run(`professionals/${id}/${reasonDialog.value}`, { reason: reason.value })) {
    reasonDialog.value = null;
    reason.value = '';
  }
}
const note = ref('');
watch(p, (v) => (note.value = v?.adminNote ?? ''), { immediate: true });
async function saveNote() {
  try {
    await api(`/admin/professionals/${id}/note`, { method: 'PUT', body: { note: note.value } });
    toast.success(t('admin.saved'));
  } catch (e) {
    toast.error(errMsg(e));
  }
}
const qualForm = reactive<Record<string, { internalNote: string; rejectionReason: string }>>({});
watch(p, (v) => v?.qualifications.forEach((q: any) => (qualForm[q.id] ??= { internalNote: q.internalNote ?? '', rejectionReason: '' })), { immediate: true });
function reviewQual(qid: string, status: 'VERIFIED' | 'REJECTED' | 'PENDING') {
  return run(`qualifications/${qid}/review`, { status, ...qualForm[qid] }, `q:${qid}:${status}`);
}
const tone = (s: string) => (s === 'VERIFIED' || s === 'APPROVED' ? 'success' : s === 'REJECTED' || s === 'SUSPENDED' ? 'danger' : 'warning');
</script>

<template>
  <div v-if="p" class="space-y-6">
    <NuxtLink :to="localePath('/admin/professionals')" class="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"><ArrowLeft class="size-4" aria-hidden="true" />{{ t('admin.nav.applications') }}</NuxtLink>
    <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div class="flex items-start gap-4">
        <UiAvatar :src="p.portraitUrl" :name="p.displayName || '?'" :size="72" />
        <div>
          <h1 class="text-2xl font-semibold">{{ p.displayName }}</h1>
          <p class="text-muted">{{ p.user.email }} · {{ p.user.phone || '—' }} · {{ t('admin.registered') }} {{ date(p.user.createdAt) }}</p>
          <div class="mt-2 flex flex-wrap gap-2"><UiBadge :tone="tone(p.status)">{{ t(`profileStatus.${p.status}`) }}</UiBadge><UiBadge v-if="p.user.status === 'SUSPENDED'" tone="danger">{{ t('admin.accountSuspended') }}</UiBadge><UiBadge v-if="p.isDemo" tone="peach">{{ t('demo.label') }}</UiBadge></div>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <UiButton v-if="p.status === 'APPROVED'" variant="secondary" :to="localePath(`/professionals/${p.slug}`)"><ExternalLink class="size-4" aria-hidden="true" />{{ t('onboarding.viewPublic') }}</UiButton>
        <UiButton v-if="p.status === 'PENDING'" :loading="busy === `professionals/${id}/approve`" @click="run(`professionals/${id}/approve`)">{{ t('admin.approve') }}</UiButton>
        <UiButton v-if="p.status === 'PENDING'" variant="secondary" @click="reasonDialog = 'reject'">{{ t('admin.reject') }}</UiButton>
        <UiButton v-if="['APPROVED', 'PENDING'].includes(p.status)" variant="ghost" class="text-danger" @click="reasonDialog = 'suspend'">{{ t('admin.suspend') }}</UiButton>
        <UiButton v-if="p.status === 'SUSPENDED'" variant="secondary" @click="run(`professionals/${id}/reinstate`)">{{ t('admin.reinstate') }}</UiButton>
      </div>
    </div>
    <UiAlert v-if="p.rejectionReason" tone="danger" :title="t('admin.lastReason')">{{ p.rejectionReason }}</UiAlert>

    <div class="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div class="space-y-6">
        <UiCard>
          <h2 class="text-lg font-semibold">{{ t('admin.profileContent') }}</h2>
          <div v-for="tr in p.translations" :key="tr.locale" class="mt-4 border-t border-line pt-4 first:mt-3 first:border-0 first:pt-0">
            <p class="text-sm text-muted">{{ tr.locale.toUpperCase() }} <span v-if="tr.locale === p.originalLocale">· {{ t('admin.original') }}</span></p>
            <p class="font-medium">{{ tr.headline }}</p>
            <p class="mt-1 whitespace-pre-line text-[#475467]">{{ tr.bio }}</p>
          </div>
          <dl class="mt-5 grid gap-3 border-t border-line pt-5 text-[0.9375rem] sm:grid-cols-2">
            <div><dt class="text-sm text-muted">{{ t('admin.col.category') }}</dt><dd>{{ tx(p.category) }}</dd></div>
            <div><dt class="text-sm text-muted">{{ t('onboarding.years') }}</dt><dd>{{ p.experienceYears }}</dd></div>
            <div><dt class="text-sm text-muted">{{ t('onboarding.birthYear') }}</dt><dd>{{ p.birthYear ?? '—' }}</dd></div>
            <div><dt class="text-sm text-muted">{{ t('onboarding.education') }}</dt><dd>{{ p.educationLevel ? t(`education.${p.educationLevel.toLowerCase()}`) : '—' }}</dd></div>
            <div><dt class="text-sm text-muted">{{ t('onboarding.availableFrom') }}</dt><dd>{{ p.availableFrom ? ymd(p.availableFrom, { month: 'long' }) : t('admin.availableNow') }}</dd></div>
            <div><dt class="text-sm text-muted">{{ t('admin.attributes') }}</dt><dd>{{ p.attributes.map(tx).join(', ') || '—' }}</dd></div>
            <div><dt class="text-sm text-muted">{{ t('onboarding.homeLocation') }}</dt><dd>{{ tx(p.homeLocation) }}</dd></div>
            <div><dt class="text-sm text-muted">{{ t('onboarding.serviceAreas') }}</dt><dd>{{ p.serviceAreas.map(tx).join(', ') }}</dd></div>
            <div><dt class="text-sm text-muted">{{ t('card.languages') }}</dt><dd>{{ p.languages.map((l: string) => t(`lang.${l}`)).join(', ') }}</dd></div>
            <div><dt class="text-sm text-muted">{{ t('profile.schedule') }}</dt><dd>{{ p.rules.map((r: any) => `${weekday(r.weekday)} ${minutes(r.startMinute)}–${minutes(r.endMinute)}`).join(', ') || '—' }}</dd></div>
          </dl>
          <p v-if="p.experienceSummary" class="mt-4 text-[#475467]">{{ p.experienceSummary }}</p>
          <ul class="mt-5 divide-y divide-line border-t border-line">
            <li v-for="(o, i) in p.offerings" :key="i" class="flex flex-wrap justify-between gap-2 py-2.5">
              <span>{{ tx(o.service) }} <UiBadge v-if="o.requiredQualification" tone="warning">{{ t('admin.requires') }}: {{ t(`verification.kind.${o.requiredQualification}`) }}</UiBadge></span>
              <span class="font-medium">{{ price({ kind: o.priceKind, amount: o.priceAmount, unit: o.priceUnit }) }}</span>
            </li>
          </ul>
        </UiCard>

        <UiCard>
          <h2 class="text-lg font-semibold">{{ t('admin.credentials') }}</h2>
          <p class="mt-1 text-sm text-muted">{{ t('admin.credentialsHelp') }}</p>
          <p v-if="!p.qualifications.length" class="mt-4 text-muted">{{ t('verificationPage.none') }}</p>
          <div v-for="q in p.qualifications" :key="q.id" class="mt-4 rounded-[var(--radius-control)] border border-line p-4">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p class="font-medium">{{ t(`verification.kind.${q.kind}`) }} — {{ q.title }}</p>
                <p class="text-sm text-muted">{{ [q.issuer, q.issuedYear].filter(Boolean).join(', ') || '—' }}</p>
              </div>
              <UiBadge :tone="tone(q.status)">{{ t(`verificationStatus.${q.status}`) }}</UiBadge>
            </div>
            <p v-if="q.reviewedAt" class="mt-1 text-xs text-muted">{{ t('admin.reviewedAt') }} {{ dateTime(q.reviewedAt) }}</p>
            <ul class="mt-3 space-y-1">
              <li v-for="d in q.documents" :key="d.id">
                <a :href="`/api/admin/documents/${d.id}`" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"><FileText class="size-4" aria-hidden="true" />{{ d.originalName }} ({{ Math.ceil(d.size / 1024) }} KB)</a>
              </li>
              <li v-if="!q.documents.length" class="text-sm text-muted">{{ t('admin.noDocuments') }}</li>
            </ul>
            <p class="mt-2 text-xs text-muted">{{ t('admin.documentAudit') }}</p>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <UiTextarea v-model="qualForm[q.id]!.internalNote" :label="t('admin.internalNote')" :rows="2" />
              <UiTextarea v-model="qualForm[q.id]!.rejectionReason" :label="t('admin.rejectionReason')" :help="t('admin.rejectionHelp')" :rows="2" />
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              <UiButton size="sm" :loading="busy === `q:${q.id}:VERIFIED`" @click="reviewQual(q.id, 'VERIFIED')">{{ t('admin.verify') }}</UiButton>
              <UiButton size="sm" variant="secondary" :loading="busy === `q:${q.id}:REJECTED`" @click="reviewQual(q.id, 'REJECTED')">{{ t('admin.reject') }}</UiButton>
              <UiButton v-if="q.status !== 'PENDING'" size="sm" variant="ghost" @click="reviewQual(q.id, 'PENDING')">{{ t('admin.resetToPending') }}</UiButton>
            </div>
          </div>
        </UiCard>
      </div>
      <UiCard class="self-start">
        <h2 class="text-lg font-semibold">{{ t('admin.internalNote') }}</h2>
        <p class="mt-1 text-sm text-muted">{{ t('admin.internalNoteHelp') }}</p>
        <UiTextarea v-model="note" :rows="5" class="mt-3" :label="t('admin.internalNote')" />
        <UiButton variant="secondary" size="sm" class="mt-3" @click="saveNote">{{ t('common.save') }}</UiButton>
      </UiCard>
    </div>

    <UiDialog :open="!!reasonDialog" :title="reasonDialog === 'reject' ? t('admin.rejectTitle') : t('admin.suspendTitle')" size="sm" @update:open="(v) => !v && (reasonDialog = null)">
      <UiTextarea v-model="reason" :label="t('admin.reasonForPro')" :help="t('admin.reasonHelp')" :rows="4" :maxlength="1000" />
      <template #footer>
        <UiButton variant="ghost" @click="reasonDialog = null">{{ t('common.cancel') }}</UiButton>
        <UiButton variant="danger" :loading="!!busy" @click="submitReason">{{ reasonDialog === 'reject' ? t('admin.reject') : t('admin.suspend') }}</UiButton>
      </template>
    </UiDialog>
  </div>
</template>
