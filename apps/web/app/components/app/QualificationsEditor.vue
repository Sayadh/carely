<script setup lang="ts">
import { FileText, Trash2, Upload, Plus, Pencil } from 'lucide-vue-next';
import { QUALIFICATION_KINDS, qualificationInputSchema, LIMITS, type QualificationDto } from '@carely/shared';
const props = defineProps<{ items: QualificationDto[] }>();
const { t } = useI18n();
const { save } = useProProfile();
const { progress, upload } = useUpload();
const toast = useToast();
const errMsg = useErrorMessage();
const { date } = useFormat();
const { errors, fromZod, set, clear } = useFieldErrors();

const dialog = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({ kind: 'IDENTITY' as (typeof QUALIFICATION_KINDS)[number], title: '', issuer: '', issuedYear: null as number | null });
const busy = ref(false);
const uploadingFor = ref<string | null>(null);

function openNew() {
  editingId.value = null;
  Object.assign(form, { kind: 'IDENTITY', title: '', issuer: '', issuedYear: null });
  clear();
  dialog.value = true;
}
function openEdit(q: QualificationDto) {
  editingId.value = q.id;
  Object.assign(form, { kind: q.kind, title: q.title, issuer: q.issuer, issuedYear: q.issuedYear });
  clear();
  dialog.value = true;
}
async function submit() {
  clear();
  const parsed = qualificationInputSchema.safeParse({ ...form, issuedYear: form.issuedYear || null });
  if (!parsed.success) return fromZod(parsed.error.issues);
  busy.value = true;
  try {
    if (editingId.value) await save(`/qualifications/${editingId.value}`, parsed.data, 'PUT');
    else await save('/qualifications', parsed.data, 'POST');
    dialog.value = false;
  } catch (e) {
    set(e);
    toast.error(errMsg(e));
  } finally {
    busy.value = false;
  }
}
async function remove(id: string) {
  try {
    await save(`/qualifications/${id}`, null, 'DELETE');
  } catch (e) {
    toast.error(errMsg(e));
  }
}
async function removeDoc(id: string) {
  try {
    await save(`/documents/${id}`, null, 'DELETE');
  } catch (e) {
    toast.error(errMsg(e));
  }
}
async function onFile(qid: string, e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  (e.target as HTMLInputElement).value = '';
  if (!file) return;
  if (file.size > LIMITS.documentMaxBytes) return toast.error(t('errors.FILE_TOO_LARGE', { maxMb: LIMITS.documentMaxBytes / 1024 / 1024 }));
  uploadingFor.value = qid;
  try {
    await upload(`/me/qualifications/${qid}/documents`, file);
    await useProProfile().load();
    toast.success(t('verificationPage.uploaded'));
  } catch (err) {
    toast.error(errMsg(err));
  } finally {
    uploadingFor.value = null;
  }
}
const tone = (s: string) => (s === 'VERIFIED' ? 'success' : s === 'REJECTED' ? 'danger' : 'warning');
</script>

<template>
  <div>
    <UiAlert tone="info" class="mb-4">{{ t('verificationPage.privacy') }}</UiAlert>
    <ul v-if="items.length" class="space-y-3">
      <li v-for="q in items" :key="q.id" class="card p-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="font-medium">{{ t(`verification.kind.${q.kind}`) }} — {{ q.title }}</p>
            <p class="text-sm text-muted">{{ [q.issuer, q.issuedYear].filter(Boolean).join(', ') }}</p>
          </div>
          <div class="flex items-center gap-1">
            <UiBadge :tone="tone(q.status)">{{ t(`verificationStatus.${q.status}`) }}</UiBadge>
            <button type="button" class="inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-bg" :aria-label="t('common.edit')" @click="openEdit(q)"><Pencil class="size-4" /></button>
            <button type="button" class="inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-bg hover:text-danger" :aria-label="t('common.delete')" @click="remove(q.id)"><Trash2 class="size-4" /></button>
          </div>
        </div>
        <p v-if="q.status === 'VERIFIED' && q.verifiedAt" class="mt-2 text-sm text-success">{{ t('profile.verifiedOn', { date: date(q.verifiedAt) }) }}</p>
        <p v-if="q.status === 'REJECTED' && q.rejectionReason" class="mt-2 text-sm text-danger">{{ t('verificationPage.rejected') }}: {{ q.rejectionReason }}</p>
        <ul v-if="q.documents.length" class="mt-3 space-y-1.5">
          <li v-for="d in q.documents" :key="d.id" class="flex items-center gap-2 text-sm">
            <FileText class="size-4 text-muted" aria-hidden="true" /><span class="truncate">{{ d.originalName }}</span>
            <span class="text-muted">({{ Math.ceil(d.size / 1024) }} KB)</span>
            <button type="button" class="ml-auto text-muted hover:text-danger" :aria-label="t('common.delete')" @click="removeDoc(d.id)"><Trash2 class="size-4" /></button>
          </li>
        </ul>
        <div class="mt-3">
          <label class="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-line-strong px-3 text-sm font-medium hover:bg-bg has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary-ring">
            <Upload class="size-4" aria-hidden="true" />{{ t('verificationPage.upload') }}
            <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" class="sr-only" :disabled="!!uploadingFor" @change="onFile(q.id, $event)" />
          </label>
          <span class="ml-2 text-xs text-muted">{{ t('verificationPage.fileHint', { mb: LIMITS.documentMaxBytes / 1024 / 1024 }) }}</span>
          <div v-if="uploadingFor === q.id && progress != null" class="mt-2 h-2 overflow-hidden rounded-full bg-bg" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100" :aria-label="t('verificationPage.uploading')">
            <div class="h-full bg-primary transition-all" :style="{ width: progress + '%' }" />
          </div>
        </div>
      </li>
    </ul>
    <p v-else class="text-muted">{{ t('verificationPage.none') }}</p>
    <UiButton variant="secondary" class="mt-4" @click="openNew"><Plus class="size-4" aria-hidden="true" />{{ t('verificationPage.add') }}</UiButton>

    <UiDialog v-model:open="dialog" :title="editingId ? t('verificationPage.edit') : t('verificationPage.add')" size="sm">
      <form id="qual-form" class="space-y-4" novalidate @submit.prevent="submit">
        <UiSelect v-model="form.kind" :label="t('verificationPage.kind')" :options="QUALIFICATION_KINDS.map((k) => ({ value: k, label: t(`verification.kind.${k}`) }))" />
        <UiInput v-model="form.title" :label="t('verificationPage.titleLabel')" :error="errors.title" :help="t('verificationPage.titleHelp')" required />
        <UiInput v-model="form.issuer" :label="t('verificationPage.issuer')" :error="errors.issuer" />
        <UiInput v-model.number="form.issuedYear" type="number" inputmode="numeric" :label="t('verificationPage.year')" :error="errors.issuedYear" />
        <UiAlert v-if="editingId" tone="warning">{{ t('verificationPage.editResets') }}</UiAlert>
      </form>
      <template #footer>
        <UiButton variant="ghost" @click="dialog = false">{{ t('common.cancel') }}</UiButton>
        <UiButton type="submit" form="qual-form" :loading="busy">{{ t('common.save') }}</UiButton>
      </template>
    </UiDialog>
  </div>
</template>
