<script setup lang="ts">
import { ArrowLeft, ExternalLink, Phone, Search } from 'lucide-vue-next';
import { LEAD_STATUSES, type LeadAdminDto, type LeadStatus } from '@carely/shared';
definePageMeta({ layout: 'admin', middleware: 'admin' });

/** One team request: call the client, pick or change the professional, record the outcome. */
const { t } = useI18n();
const api = useApi();
const route = useRoute();
const toast = useToast();
const errMsg = useErrorMessage();
const localePath = useLocalePath();
const { tx, date, dateTime } = useFormat();
const id = String(route.params.id);
const period = (x: LeadAdminDto) => `${x.startDate ? date(x.startDate) : '…'} – ${x.endDate ? date(x.endDate) : t('lead.openEnded')}`;

const { data: lead, error } = await useAsyncData(`admin:lead:${id}`, () => api<LeadAdminDto>(`/admin/leads/${id}`));
if (error.value || !lead.value) throw createError({ statusCode: 404, statusMessage: 'Not found', fatal: true });
const l = computed(() => lead.value!);
useSeoMeta({ title: () => `${t('admin.nav.leads')} · ${l.value.name}`, robots: 'noindex' });

const form = reactive({ status: l.value.status as LeadStatus, adminNote: l.value.adminNote ?? '' });
const busy = ref(false);
async function save(patch: Record<string, unknown>) {
  busy.value = true;
  try {
    lead.value = await api<LeadAdminDto>(`/admin/leads/${id}`, { method: 'PATCH', body: patch });
    form.status = lead.value.status;
    form.adminNote = lead.value.adminNote ?? '';
    toast.success(t('admin.saved'));
  } catch (e) {
    toast.error(errMsg(e));
  } finally {
    busy.value = false;
  }
}

// Assign another approved professional (the requested one stays on record).
type ProRow = { id: string; slug: string; displayName: string; category: Record<string, string> };
const proQuery = ref('');
const proResults = ref<ProRow[] | null>(null);
async function searchPros() {
  try {
    proResults.value = (await api<{ items: ProRow[] }>('/admin/professionals', { query: { status: 'APPROVED', q: proQuery.value.trim() || undefined } })).items.slice(0, 8);
  } catch (e) {
    toast.error(errMsg(e));
  }
}
async function assign(professionalId: string | null) {
  await save({ professionalId });
  proResults.value = null;
  proQuery.value = '';
}
</script>

<template>
  <div class="space-y-6">
    <NuxtLink :to="localePath('/admin/leads')" class="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"><ArrowLeft class="size-4" aria-hidden="true" />{{ t('admin.leads.back') }}</NuxtLink>
    <AppPageHeader :title="l.name" :subtitle="`${t(`leadSource.${l.source}`)} · ${dateTime(l.createdAt)}`">
      <AppLeadStatusBadge :status="l.status" />
    </AppPageHeader>

    <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div class="space-y-6">
        <UiCard>
          <h2 class="text-lg font-semibold">{{ t('admin.leads.client') }}</h2>
          <dl class="mt-3 grid gap-3 sm:grid-cols-2">
            <div><dt class="text-sm text-muted">{{ t('admin.leads.name') }}</dt><dd class="font-medium">{{ l.name }}</dd></div>
            <div>
              <dt class="text-sm text-muted">{{ t('lead.phone') }}</dt>
              <dd><a :href="`tel:${l.phone}`" class="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"><Phone class="size-4" aria-hidden="true" />{{ l.phone }}</a></dd>
            </div>
            <div v-if="l.user"><dt class="text-sm text-muted">{{ t('admin.leads.account') }}</dt><dd>{{ l.user.email }}</dd></div>
            <div><dt class="text-sm text-muted">{{ t('admin.leads.language') }}</dt><dd>{{ l.locale.toUpperCase() }}</dd></div>
          </dl>
        </UiCard>

        <UiCard>
          <h2 class="text-lg font-semibold">{{ t('admin.leads.request') }}</h2>
          <dl class="mt-3 space-y-3">
            <div v-if="l.requestedProfessional">
              <dt class="text-sm text-muted">{{ t('admin.leads.requestedPro') }}</dt>
              <dd>
                <NuxtLink :to="localePath(`/professionals/${l.requestedProfessional.slug}`)" target="_blank" class="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                  {{ l.requestedProfessional.displayName }} <ExternalLink class="size-3.5" aria-hidden="true" />
                </NuxtLink>
              </dd>
            </div>
            <div v-if="l.category"><dt class="text-sm text-muted">{{ t('lead.category') }}</dt><dd>{{ tx(l.category) }}</dd></div>
            <div v-if="l.service"><dt class="text-sm text-muted">{{ t('request.service') }}</dt><dd>{{ tx(l.service) }}</dd></div>
            <div v-if="l.location"><dt class="text-sm text-muted">{{ t('request.location') }}</dt><dd>{{ tx(l.location) }}</dd></div>
            <div v-if="l.startDate || l.endDate"><dt class="text-sm text-muted">{{ t('lead.period') }}</dt><dd>{{ period(l) }}</dd></div>
            <div v-if="l.schedule"><dt class="text-sm text-muted">{{ t('lead.schedule') }}</dt><dd>{{ l.schedule }}</dd></div>
            <div v-if="l.message"><dt class="text-sm text-muted">{{ t('lead.message') }}</dt><dd class="whitespace-pre-line">{{ l.message }}</dd></div>
          </dl>
        </UiCard>
      </div>

      <div class="space-y-6">
        <UiCard>
          <h2 class="text-lg font-semibold">{{ t('admin.leads.assignedPro') }}</h2>
          <div v-if="l.professional" class="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <NuxtLink :to="localePath(`/professionals/${l.professional.slug}`)" target="_blank" class="font-medium text-primary hover:underline">{{ l.professional.displayName }}</NuxtLink>
              <p v-if="l.professional.phone"><a :href="`tel:${l.professional.phone}`" class="inline-flex items-center gap-1.5 text-[0.9375rem] hover:underline"><Phone class="size-4" aria-hidden="true" />{{ l.professional.phone }}</a></p>
              <p v-else class="text-sm text-muted">{{ t('admin.leads.noProPhone') }}</p>
            </div>
            <UiButton size="sm" variant="ghost" :loading="busy" @click="assign(null)">{{ t('admin.leads.unassign') }}</UiButton>
          </div>
          <p v-else class="mt-2 text-muted">{{ t('admin.leads.noAssigned') }}</p>

          <form class="mt-4 flex gap-2" role="search" @submit.prevent="searchPros">
            <UiInput v-model="proQuery" :label="t('admin.leads.findPro')" :placeholder="t('admin.leads.findProPlaceholder')" class="flex-1 [&_.field-label]:sr-only" />
            <UiButton type="submit" variant="secondary" :aria-label="t('common.search')"><Search class="size-4" aria-hidden="true" /></UiButton>
          </form>
          <ul v-if="proResults" class="mt-3 divide-y divide-line rounded-[var(--radius-control)] border border-line">
            <li v-for="p in proResults" :key="p.id" class="flex items-center justify-between gap-2 px-3 py-2">
              <span class="min-w-0"><span class="font-medium">{{ p.displayName }}</span> <span class="text-sm text-muted">· {{ tx(p.category) }}</span></span>
              <UiButton size="sm" variant="soft" :disabled="p.id === l.professional?.id" :loading="busy" @click="assign(p.id)">{{ t('admin.leads.assign') }}</UiButton>
            </li>
            <li v-if="!proResults.length" class="px-3 py-2 text-sm text-muted">{{ t('common.noMatches') }}</li>
          </ul>
        </UiCard>

        <UiCard>
          <h2 class="text-lg font-semibold">{{ t('admin.leads.outcome') }}</h2>
          <form class="mt-3 space-y-3" @submit.prevent="save({ status: form.status, adminNote: form.adminNote })">
            <UiSelect v-model="form.status" :label="t('admin.col.status')" :options="LEAD_STATUSES.map((s) => ({ value: s, label: t(`leadStatus.${s}`) }))" />
            <UiTextarea v-model="form.adminNote" :label="t('admin.internalNote')" :help="t('admin.leads.noteHelp')" :rows="4" :maxlength="2000" />
            <UiButton type="submit" :loading="busy">{{ t('common.save') }}</UiButton>
            <p v-if="l.handledBy" class="text-sm text-muted">{{ t('admin.leads.handledBy', { name: l.handledBy }) }} · {{ dateTime(l.updatedAt) }}</p>
          </form>
        </UiCard>
      </div>
    </div>
  </div>
</template>
