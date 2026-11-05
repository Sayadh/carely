<script setup lang="ts">
import { CalendarDays, MapPin, Phone, Mail, Repeat, StickyNote, ArrowLeft, Star, LifeBuoy } from 'lucide-vue-next';
import type { RequestDetailDto } from '@carely/shared';
import { createReviewSchema, cancelSchema, LIMITS, REVIEW_REASON_MIN } from '@carely/shared';

definePageMeta({ layout: 'dashboard', section: 'account', sharedSection: true, middleware: 'auth' });
const route = useRoute();
const { t, locale } = useI18n();
const api = useApi();
const toast = useToast();
const errMsg = useErrorMessage();
const localePath = useLocalePath();
const auth = useAuthStore();
const { tx, price, range, dateTime, ymd, minutes, weekday, relative } = useFormat();
const id = computed(() => String(route.params.id));

const { data: r, error, refresh } = await useAsyncData(`request:${id.value}`, () => api<RequestDetailDto>(`/requests/${id.value}`));
if (error.value?.cause && (error.value.cause as any).status === 404) throw createError({ statusCode: 404, fatal: true });
const section = useState<'account' | 'pro' | null>('dashboard-section');
watchEffect(() => (section.value = r.value?.role === 'PROFESSIONAL' ? 'pro' : 'account'));
onBeforeUnmount(() => (section.value = null));
useSeoMeta({ title: () => t('request.detailTitle'), robots: 'noindex' });

const busy = ref<string | null>(null);
const completeDialog = ref(false);
async function act(action: 'accept' | 'confirm' | 'complete') {
  completeDialog.value = false;
  busy.value = action;
  try {
    r.value = await api<RequestDetailDto>(`/requests/${id.value}/${action}`, { method: 'POST' });
    toast.success(t(`request.done.${action}`));
    auth.fetch();
  } catch (e) {
    toast.error(errMsg(e));
    await refresh();
  } finally {
    busy.value = null;
  }
}

// Decline / cancel with a reason
const reasonDialog = ref<null | 'decline' | 'cancel'>(null);
const reason = ref('');
const reasonError = ref('');
async function submitReason() {
  reasonError.value = '';
  if (reasonDialog.value === 'cancel' && !cancelSchema.safeParse({ reason: reason.value }).success) {
    reasonError.value = t('validation.required');
    return;
  }
  const action = reasonDialog.value!;
  busy.value = action;
  try {
    r.value = await api<RequestDetailDto>(`/requests/${id.value}/${action}`, { method: 'POST', body: { reason: reason.value } });
    toast.success(t(`request.done.${action}`));
    reasonDialog.value = null;
    reason.value = '';
  } catch (e) {
    reasonError.value = errMsg(e);
  } finally {
    busy.value = null;
  }
}

// Notes
const note = ref('');
async function addNote() {
  if (!note.value.trim()) return;
  busy.value = 'note';
  try {
    r.value = await api<RequestDetailDto>(`/requests/${id.value}/notes`, { method: 'POST', body: { body: note.value } });
    note.value = '';
  } catch (e) {
    toast.error(errMsg(e));
  } finally {
    busy.value = null;
  }
}

// Review
// Phone is prefilled from the account (editable) and is visible to admins only.
const review = reactive({ rating: 5, body: '', contactPhone: auth.user?.phone ?? '' });
const reviewError = ref('');
const reviewSent = ref(false);
const reviewFields = useFieldErrors();
const reasonRequired = computed(() => review.rating < 5);
async function sendReview() {
  reviewError.value = '';
  reviewFields.clear();
  const payload = { requestId: id.value, rating: review.rating, body: review.body, contactPhone: review.contactPhone, locale: locale.value };
  const parsed = createReviewSchema.safeParse(payload);
  if (!parsed.success) return reviewFields.fromZod(parsed.error.issues);
  busy.value = 'review';
  try {
    await api('/reviews', { method: 'POST', body: payload });
    reviewSent.value = true;
    await refresh();
  } catch (e) {
    reviewFields.set(e);
    reviewError.value = errMsg(e);
  } finally {
    busy.value = null;
  }
}
const can = (a: string) => r.value?.allowedActions.includes(a);
const backTo = computed(() => localePath(r.value?.role === 'PROFESSIONAL' ? '/pro/requests' : '/account/requests'));
</script>

<template>
  <div v-if="r">
    <NuxtLink :to="backTo" class="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"><ArrowLeft class="size-4" aria-hidden="true" />{{ t('request.backToList') }}</NuxtLink>
    <div class="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div class="min-w-0 space-y-6">
        <UiCard>
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
            <UiAvatar :src="r.counterpart.portraitUrl" :name="r.counterpart.name" :size="64" />
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="text-xl font-semibold">{{ tx(r.service) }}</h1>
                <AppStatusBadge :status="r.status" />
              </div>
              <p class="mt-1 text-[#475467]">
                {{ r.role === 'CUSTOMER' ? t('request.withPro') : t('request.fromCustomer') }}:
                <NuxtLink v-if="r.counterpart.slug" :to="localePath(`/professionals/${r.counterpart.slug}`)" class="font-medium text-primary hover:underline">{{ r.counterpart.name }}</NuxtLink>
                <span v-else class="font-medium">{{ r.counterpart.name }}</span>
              </p>
            </div>
          </div>
          <dl class="mt-5 grid gap-4 border-t border-line pt-5 text-[0.9375rem] sm:grid-cols-2">
            <div>
              <dt class="text-sm text-muted">{{ t('request.when') }}</dt>
              <dd v-if="!r.recurrence" class="mt-0.5 flex items-center gap-1.5"><CalendarDays class="size-4 text-muted" aria-hidden="true" />{{ range(r.startAt, r.endAt) }}</dd>
              <dd v-else class="mt-0.5">
                <span class="flex items-center gap-1.5"><Repeat class="size-4 text-muted" aria-hidden="true" />{{ r.recurrence.weekdays.map((d) => weekday(d)).join(', ') }} · {{ minutes(r.recurrence.startMinute) }}–{{ minutes(r.recurrence.endMinute) }}</span>
                <span class="text-sm text-muted">{{ ymd(r.recurrence.startDate) }} – {{ ymd(r.recurrence.endDate) }} · {{ t('request.occurrences', r.occurrenceCount) }}</span>
              </dd>
            </div>
            <div>
              <dt class="text-sm text-muted">{{ t('request.location') }}</dt>
              <dd class="mt-0.5 flex items-center gap-1.5"><MapPin class="size-4 text-muted" aria-hidden="true" />{{ tx(r.location) }}<span v-if="r.addressNote" class="text-muted">· {{ r.addressNote }}</span></dd>
            </div>
            <div>
              <dt class="text-sm text-muted">{{ t('request.priceAtRequest') }}</dt>
              <dd class="mt-0.5">{{ price(r.price) }}</dd>
            </div>
            <div v-if="r.status === 'ACCEPTED' && r.expiresAt">
              <dt class="text-sm text-muted">{{ t('request.confirmBy') }}</dt>
              <dd class="mt-0.5 font-medium text-warning">{{ dateTime(r.expiresAt) }} <ClientOnly>({{ relative(r.expiresAt) }})</ClientOnly></dd>
            </div>
          </dl>
          <div v-if="r.requirements" class="mt-5 border-t border-line pt-5">
            <h2 class="text-sm text-muted">{{ t('request.requirements') }}</h2>
            <p class="mt-1 whitespace-pre-line">{{ r.requirements }}</p>
          </div>
          <UiAlert v-if="r.declineReason" tone="info" class="mt-5" :title="t('request.declineReason')">{{ r.declineReason }}</UiAlert>
          <UiAlert v-if="r.cancelReason" tone="info" class="mt-5" :title="t('request.cancelReason')">{{ r.cancelReason }}</UiAlert>
        </UiCard>

        <UiCard v-if="r.contacts">
          <h2 class="text-lg font-semibold">{{ t('request.contacts') }}</h2>
          <p class="mt-1 text-sm text-muted">{{ t('request.contactsNote') }}</p>
          <div class="mt-4 grid gap-4 sm:grid-cols-2">
            <div v-for="(c, key) in { customer: r.contacts.customer, professional: r.contacts.professional }" :key="key" class="rounded-[var(--radius-control)] bg-bg p-4">
              <p class="text-sm text-muted">{{ t(`request.role.${key}`) }}</p>
              <p class="font-medium">{{ c.name }}</p>
              <a v-if="c.phone" :href="`tel:${c.phone}`" class="mt-1 flex items-center gap-1.5 text-primary hover:underline"><Phone class="size-4" aria-hidden="true" />{{ c.phone }}</a>
              <a :href="`mailto:${c.email}`" class="mt-1 flex items-center gap-1.5 break-all text-primary hover:underline"><Mail class="size-4" aria-hidden="true" />{{ c.email }}</a>
            </div>
          </div>
          <p class="mt-3 text-xs text-muted">{{ t('request.phoneUnverified') }}</p>
        </UiCard>

        <UiCard v-if="r.occurrences.length > 1">
          <h2 class="text-lg font-semibold">{{ r.status === 'CONFIRMED' || r.status === 'COMPLETED' ? t('request.reservedSlots') : t('request.requestedSlots') }}</h2>
          <ul class="mt-3 grid gap-1.5 text-[0.9375rem] sm:grid-cols-2">
            <li v-for="o in r.occurrences" :key="o.startAt" class="rounded-lg bg-bg px-3 py-2">{{ range(o.startAt, o.endAt) }}</li>
          </ul>
        </UiCard>

        <UiCard v-if="can('review') && !reviewSent">
          <h2 class="text-lg font-semibold">{{ t('review.title') }}</h2>
          <p class="mt-1 text-sm text-muted">{{ t('review.moderationNote') }}</p>
          <form class="mt-4 space-y-4" @submit.prevent="sendReview">
            <fieldset>
              <legend class="field-label">{{ t('review.rating') }}</legend>
              <div class="flex gap-1">
                <label v-for="n in 5" :key="n" class="cursor-pointer rounded p-1 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary-ring">
                  <input v-model="review.rating" type="radio" :value="n" class="sr-only" :aria-label="t('profile.ratingOf', { n })" />
                  <Star class="size-7" :class="n <= review.rating ? 'fill-[#f5b546] text-[#f5b546]' : 'text-line-strong'" aria-hidden="true" />
                </label>
              </div>
            </fieldset>
            <UiTextarea
              v-model="review.body"
              :label="reasonRequired ? t('review.reasonLabel') : t('review.bodyOptional')"
              :help="reasonRequired ? t('review.reasonHelp', { n: REVIEW_REASON_MIN }) : undefined"
              :required="reasonRequired"
              :maxlength="LIMITS.reviewMax"
              :rows="4"
              :error="reviewFields.errors.value.body"
            />
            <UiInput
              v-model="review.contactPhone"
              type="tel"
              autocomplete="tel"
              inputmode="tel"
              placeholder="+374 XX XXXXXX"
              :label="t('review.phone')"
              :help="t('review.phonePrivate')"
              :error="reviewFields.errors.value.contactPhone"
              required
            />
            <UiAlert v-if="reviewError" tone="danger">{{ reviewError }}</UiAlert>
            <UiButton type="submit" :loading="busy === 'review'">{{ t('review.submit') }}</UiButton>
          </form>
        </UiCard>
        <UiAlert v-if="reviewSent || (r.hasReview && r.role === 'CUSTOMER')" tone="success">{{ t('review.sent') }}</UiAlert>

        <UiCard>
          <h2 class="flex items-center gap-2 text-lg font-semibold"><StickyNote class="size-5 text-muted" aria-hidden="true" />{{ t('request.notes') }}</h2>
          <p class="mt-1 text-sm text-muted">{{ t('request.notesHelp') }}</p>
          <ul v-if="r.notes.length" class="mt-4 space-y-3">
            <li v-for="n in r.notes" :key="n.id" class="rounded-[var(--radius-control)] p-3" :class="n.authorRole === r.role ? 'ml-6 bg-primary-soft' : 'mr-6 bg-bg'">
              <p class="text-xs text-muted">{{ n.authorRole === r.role ? t('request.you') : r.counterpart.name }} · {{ dateTime(n.createdAt) }}</p>
              <p class="mt-1 whitespace-pre-line">{{ n.body }}</p>
            </li>
          </ul>
          <form v-if="can('note')" class="mt-4 space-y-2" @submit.prevent="addNote">
            <UiTextarea v-model="note" :label="t('request.addNote')" :rows="2" :maxlength="LIMITS.noteMax" />
            <UiButton type="submit" variant="secondary" size="sm" :loading="busy === 'note'" :disabled="!note.trim()">{{ t('request.sendNote') }}</UiButton>
          </form>
        </UiCard>
      </div>

      <div class="space-y-6">
        <UiCard v-if="r.allowedActions.some((a) => ['accept', 'decline', 'confirm', 'complete', 'cancel'].includes(a))">
          <h2 class="text-lg font-semibold">{{ t('request.actions') }}</h2>
          <p class="mt-1 text-sm text-muted">{{ t(`request.actionHint.${r.role}.${r.status}`) }}</p>
          <div class="mt-4 flex flex-col gap-2">
            <UiButton v-if="can('accept')" :loading="busy === 'accept'" @click="act('accept')">{{ t('request.action.accept') }}</UiButton>
            <UiButton v-if="can('confirm')" :loading="busy === 'confirm'" @click="act('confirm')">{{ t('request.action.confirm') }}</UiButton>
            <UiButton v-if="can('complete')" :loading="busy === 'complete'" @click="completeDialog = true">{{ t('request.action.complete') }}</UiButton>
            <UiButton v-if="can('decline')" variant="secondary" @click="reasonDialog = 'decline'">{{ t('request.action.decline') }}</UiButton>
            <UiButton v-if="can('cancel')" variant="ghost" class="text-danger" @click="reasonDialog = 'cancel'">{{ t('request.action.cancel') }}</UiButton>
          </div>
        </UiCard>
        <UiCard v-if="r.status === 'CONFIRMED' && r.role === 'PROFESSIONAL' && !can('complete')">
          <p class="text-sm text-muted">{{ t('request.completeLater') }}</p>
        </UiCard>

        <UiCard>
          <h2 class="text-lg font-semibold">{{ t('request.history') }}</h2>
          <ol class="mt-4 space-y-4 border-l border-line pl-5">
            <li v-for="e in r.events" :key="e.id" class="relative">
              <span class="absolute -left-[25px] top-1.5 size-2.5 rounded-full bg-primary ring-4 ring-surface" aria-hidden="true" />
              <p class="font-medium">{{ t(`requestEvent.${e.type}`) }}</p>
              <p class="text-sm text-muted">{{ t(`eventActor.${e.actorRole}`) }} · {{ dateTime(e.createdAt) }}</p>
              <p v-if="e.note" class="mt-1 text-sm text-[#475467]">“{{ e.note }}”</p>
            </li>
          </ol>
        </UiCard>

        <UiCard v-if="r.role === 'CUSTOMER' && ['CONFIRMED', 'COMPLETED'].includes(r.status)">
          <h2 class="flex items-center gap-2 font-semibold"><LifeBuoy class="size-5 text-muted" aria-hidden="true" />{{ t('request.reportIssue') }}</h2>
          <p class="mt-1 text-sm text-muted">{{ t('request.reportIssueText') }}</p>
          <UiButton variant="secondary" size="sm" class="mt-3" :to="localePath({ path: '/contact', query: { topic: 'REQUEST_ISSUE', requestId: r.id } })">{{ t('request.contactSupport') }}</UiButton>
        </UiCard>
      </div>
    </div>

    <UiDialog v-model:open="completeDialog" :title="t('request.action.complete')" size="sm">
      <p>{{ t('request.completeConfirm') }}</p>
      <template #footer>
        <UiButton variant="ghost" @click="completeDialog = false">{{ t('common.back') }}</UiButton>
        <UiButton :loading="busy === 'complete'" @click="act('complete')">{{ t('request.action.complete') }}</UiButton>
      </template>
    </UiDialog>
    <UiDialog :open="!!reasonDialog" :title="reasonDialog === 'decline' ? t('request.declineTitle') : t('request.cancelTitle')" size="sm" @update:open="(v) => !v && (reasonDialog = null)">
      <UiTextarea v-model="reason" :label="reasonDialog === 'decline' ? t('request.declineReasonLabel') : t('request.cancelReasonLabel')" :rows="3" :maxlength="500" :error="reasonError" />
      <template #footer>
        <UiButton variant="ghost" @click="reasonDialog = null">{{ t('common.back') }}</UiButton>
        <UiButton :variant="reasonDialog === 'cancel' ? 'danger' : 'primary'" :loading="!!busy" @click="submitReason">{{ reasonDialog === 'decline' ? t('request.action.decline') : t('request.action.cancel') }}</UiButton>
      </template>
    </UiDialog>
  </div>
  <UiEmptyState v-else :title="t('errors.NOT_FOUND')" />
</template>
