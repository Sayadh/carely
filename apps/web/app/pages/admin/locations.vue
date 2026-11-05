<script setup lang="ts">
import { Plus, Pencil, Trash2 } from 'lucide-vue-next';
definePageMeta({ layout: 'admin', middleware: 'admin' });
const { t, locale } = useI18n();
const api = useApi();
const toast = useToast();
const errMsg = useErrorMessage();
useSeoMeta({ title: () => t('admin.nav.locations'), robots: 'noindex' });
const { data, refresh } = await useAsyncData('admin:locations', () => api<any[]>('/admin/locations'));
const label = (tr: any[]) => tr.find((x) => x.locale === locale.value)?.name ?? tr.find((x) => x.locale === 'hy')?.name ?? '—';
const regions = computed(() => (data.value ?? []).filter((l) => l.type === 'REGION'));
const children = (id: string) => (data.value ?? []).filter((l) => l.parentId === id);
const used = (l: any) => l._count.children + l._count.serviceAreas + l._count.requests;
const blankTx = () => ({ hy: { name: '', description: '' }, ru: { name: '', description: '' }, en: { name: '', description: '' } });
const editing = ref<any>(null);
function open(row?: any, parentId?: string) {
  const tx: any = blankTx();
  for (const r of row?.translations ?? []) tx[r.locale] = { name: r.name, description: r.description ?? '' };
  editing.value = { id: row?.id, form: { slug: row?.slug ?? '', type: row?.type ?? (parentId ? 'CITY' : 'REGION'), parentId: row?.parentId ?? parentId ?? null, sortOrder: row?.sortOrder ?? 0, active: row?.active ?? true, translations: tx } };
}
async function save() {
  const e = editing.value;
  try {
    await api(`/admin/locations${e.id ? `/${e.id}` : ''}`, { method: e.id ? 'PUT' : 'POST', body: { ...e.form, sortOrder: Number(e.form.sortOrder) || 0, parentId: e.form.type === 'REGION' ? null : e.form.parentId } });
    toast.success(t('admin.saved'));
    editing.value = null;
    refresh();
  } catch (err) {
    toast.error(errMsg(err));
  }
}
async function remove(id: string) {
  try {
    await api(`/admin/locations/${id}`, { method: 'DELETE' });
    refresh();
  } catch (err) {
    toast.error(errMsg(err));
  }
}
</script>

<template>
  <div>
    <AppPageHeader :title="t('admin.nav.locations')" :subtitle="t('admin.locationsSubtitle')">
      <UiButton variant="secondary" @click="open()"><Plus class="size-4" aria-hidden="true" />{{ t('admin.addRegion') }}</UiButton>
    </AppPageHeader>
    <div class="space-y-4">
      <UiCard v-for="r in regions" :key="r.id" :padded="false">
        <div class="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <h2 class="font-semibold">{{ label(r.translations) }}</h2>
          <AppAdminCompleteness :translations="r.translations" />
          <UiBadge v-if="!r.active">{{ t('admin.inactive') }}</UiBadge>
          <span class="ml-auto text-xs text-muted">{{ t('admin.usedBy', { n: r._count.serviceAreas + r._count.requests }) }}</span>
          <button type="button" class="rounded p-1.5 text-muted hover:bg-bg" :aria-label="t('common.edit')" @click="open(r)"><Pencil class="size-4" /></button>
          <UiButton size="sm" variant="ghost" @click="open(undefined, r.id)"><Plus class="size-4" aria-hidden="true" />{{ t('common.add') }}</UiButton>
        </div>
        <ul class="grid gap-x-6 px-4 py-2 sm:grid-cols-2 lg:grid-cols-3">
          <li v-for="c in children(r.id)" :key="c.id" class="flex items-center gap-2 py-1.5 text-[0.9375rem]">
            <span class="flex-1">{{ label(c.translations) }} <span class="text-xs text-muted">· {{ t(`locationType.${c.type}`) }}</span></span>
            <AppAdminCompleteness :translations="c.translations" />
            <button type="button" class="rounded p-1 text-muted hover:bg-bg" :aria-label="t('common.edit')" @click="open(c)"><Pencil class="size-3.5" /></button>
            <button v-if="!used(c)" type="button" class="rounded p-1 text-muted hover:bg-bg hover:text-danger" :aria-label="t('common.delete')" @click="remove(c.id)"><Trash2 class="size-3.5" /></button>
          </li>
        </ul>
      </UiCard>
    </div>
    <UiDialog :open="!!editing" :title="editing?.id ? t('common.edit') : t('common.add')" @update:open="(v) => !v && (editing = null)">
      <form v-if="editing" id="loc-form" class="space-y-4" @submit.prevent="save">
        <div class="grid gap-3 sm:grid-cols-2">
          <UiInput v-model="editing.form.slug" :label="t('admin.tx.slug')" required />
          <UiSelect v-model="editing.form.type" :label="t('admin.tx.type')" :options="['REGION', 'CITY', 'DISTRICT'].map((x) => ({ value: x, label: t(`locationType.${x}`) }))" />
        </div>
        <UiSelect v-if="editing.form.type !== 'REGION'" v-model="editing.form.parentId" :label="t('admin.tx.parent')" :options="regions.map((r) => ({ value: r.id, label: label(r.translations) }))" />
        <UiCheckbox v-model="editing.form.active" :label="t('admin.tx.active')" />
        <AppAdminTranslationFields v-model="editing.form.translations" />
      </form>
      <template #footer>
        <UiButton variant="ghost" @click="editing = null">{{ t('common.cancel') }}</UiButton>
        <UiButton type="submit" form="loc-form">{{ t('common.save') }}</UiButton>
      </template>
    </UiDialog>
  </div>
</template>
