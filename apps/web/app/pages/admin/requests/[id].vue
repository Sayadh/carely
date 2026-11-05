<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next';
definePageMeta({ layout: 'admin', middleware: 'admin' });
const { t } = useI18n();
const api = useApi();
const route = useRoute();
const toast = useToast();
const errMsg = useErrorMessage();
const localePath = useLocalePath();
const { tx, range, dateTime, price } = useFormat();
const id = String(route.params.id);
const { data: r, refresh } = await useAsyncData(`admin:request:${id}`, () => api<any>(`/admin/requests/${id}`));
useSeoMeta({ title: () => t('request.detailTitle'), robots: 'noindex' });
const cancelOpen = ref(false);
const reason = ref('');
async function cancel() {
  try {
    await api(`/admin/requests/${id}/cancel`, { method: 'POST', body: { reason: reason.value } });
    toast.success(t('admin.saved'));
    cancelOpen.value = false;
    refresh();
  } catch (e) {
    toast.error(errMsg(e));
  }
}
</script>

<template>
  <div v-if="r" class="space-y-6">
    <NuxtLink :to="localePath('/admin/requests')" class="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"><ArrowLeft class="size-4" aria-hidden="true" />{{ t('admin.nav.requests') }}</NuxtLink>
    <UiAlert tone="info">{{ t('admin.requestAudit') }}</UiAlert>
    <UiCard>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-xl font-semibold">{{ tx(r.service) }} <AppStatusBadge :status="r.status" /></h1>
          <p class="mt-1 text-muted">{{ r.customer.name }} ({{ r.customer.email }}) → {{ r.professional.displayName }}</p>
        </div>
        <UiButton v-if="r.allowedActions.includes('cancel')" variant="ghost" class="text-danger" @click="cancelOpen = true">{{ t('request.action.cancel') }}</UiButton>
      </div>
      <dl class="mt-4 grid gap-3 text-[0.9375rem] sm:grid-cols-3">
        <div><dt class="text-sm text-muted">{{ t('request.when') }}</dt><dd>{{ range(r.startAt, r.endAt) }}</dd></div>
        <div><dt class="text-sm text-muted">{{ t('request.location') }}</dt><dd>{{ tx(r.location) }}</dd></div>
        <div><dt class="text-sm text-muted">{{ t('request.priceAtRequest') }}</dt><dd>{{ price(r.price) }}</dd></div>
      </dl>
      <p v-if="r.requirements" class="mt-4 whitespace-pre-line text-[#475467]">{{ r.requirements }}</p>
    </UiCard>
    <UiCard>
      <h2 class="text-lg font-semibold">{{ t('request.history') }}</h2>
      <ol class="mt-3 space-y-2">
        <li v-for="e in r.events" :key="e.id" class="text-[0.9375rem]"><strong>{{ t(`requestEvent.${e.type}`) }}</strong> · {{ t(`eventActor.${e.actorRole}`) }} · {{ dateTime(e.createdAt) }}<span v-if="e.note" class="text-muted"> — “{{ e.note }}”</span></li>
      </ol>
    </UiCard>
    <UiCard v-if="r.notes.length">
      <h2 class="text-lg font-semibold">{{ t('request.notes') }}</h2>
      <ul class="mt-3 space-y-2">
        <li v-for="n in r.notes" :key="n.id" class="rounded-lg bg-bg p-3 text-[0.9375rem]"><p class="text-xs text-muted">{{ t(`eventActor.${n.authorRole}`) }} · {{ dateTime(n.createdAt) }}</p>{{ n.body }}</li>
      </ul>
    </UiCard>
    <UiDialog v-model:open="cancelOpen" :title="t('request.cancelTitle')" size="sm">
      <UiTextarea v-model="reason" :label="t('admin.reasonForParticipants')" :rows="3" />
      <template #footer>
        <UiButton variant="ghost" @click="cancelOpen = false">{{ t('common.back') }}</UiButton>
        <UiButton variant="danger" @click="cancel">{{ t('request.action.cancel') }}</UiButton>
      </template>
    </UiDialog>
  </div>
</template>
