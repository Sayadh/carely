<script setup lang="ts">
import { ATTRIBUTE_GROUPS } from '@carely/shared';
definePageMeta({ layout: 'admin', middleware: 'admin' });

/** Read-only: categories, services and facets are code-managed (packages/shared/src/taxonomy) and synced by `npm run db:seed`. */
type Tx = { locale: string; name: string }[];
type Row = { id: string; slug: string; active: boolean; translations: Tx; _count?: Record<string, number> };
type TaxonomyAdmin = {
  categories: (Row & { services: (Row & { requiredQualification: string | null })[] })[];
  attributes: (Row & { group: string; categories: string[] | null })[];
};

const { t, locale } = useI18n();
const api = useApi();
useSeoMeta({ title: () => t('admin.nav.taxonomy'), robots: 'noindex' });
const { data } = await useAsyncData('admin:taxonomy', () => api<TaxonomyAdmin>('/admin/taxonomy'));
const label = (tr: Tx) => tr.find((x) => x.locale === locale.value)?.name ?? tr.find((x) => x.locale === 'hy')?.name ?? '—';
const usage = (r: Row) => Object.values(r._count ?? {}).reduce((a, b) => a + Number(b), 0);
const categoryName = (slug: string) => {
  const c = data.value?.categories.find((x) => x.slug === slug);
  return c ? label(c.translations) : slug;
};
const facetGroups = computed(() => ATTRIBUTE_GROUPS.map((g) => ({ group: g, items: (data.value?.attributes ?? []).filter((a) => a.group === g) })).filter((g) => g.items.length));
</script>

<template>
  <div>
    <AppPageHeader :title="t('admin.nav.taxonomy')" :subtitle="t('admin.taxonomySubtitle')" />
    <UiAlert tone="info" class="mb-6">{{ t('admin.taxonomyCodeManaged') }}</UiAlert>
    <div class="space-y-6">
      <UiCard v-for="c in data?.categories ?? []" :key="c.id">
        <div class="flex flex-wrap items-center gap-2">
          <AppCategoryIcon :slug="c.slug" class="size-5 text-primary" />
          <h2 class="text-lg font-semibold">{{ label(c.translations) }}</h2>
          <code class="text-xs text-muted">{{ c.slug }}</code>
          <UiBadge v-if="!c.active" tone="neutral">{{ t('admin.inactive') }}</UiBadge>
          <span class="ml-auto text-xs text-muted">{{ t('admin.usedBy', { n: usage(c) }) }}</span>
        </div>
        <ul class="mt-4 divide-y divide-line rounded-[var(--radius-control)] border border-line">
          <li v-for="s in c.services" :key="s.id" class="flex flex-wrap items-center gap-2 px-3 py-2 text-[0.9375rem]" :class="{ 'opacity-60': !s.active }">
            <span class="flex-1">
              {{ label(s.translations) }}
              <UiBadge v-if="s.requiredQualification" tone="warning">{{ t(`verification.kind.${s.requiredQualification}`) }}</UiBadge>
              <UiBadge v-if="!s.active">{{ t('admin.inactive') }}</UiBadge>
            </span>
            <code class="text-xs text-muted">{{ s.slug }}</code>
            <span class="text-xs text-muted">{{ t('admin.usedBy', { n: usage(s) }) }}</span>
          </li>
        </ul>
      </UiCard>

      <UiCard>
        <h2 class="text-lg font-semibold">{{ t('admin.attributes') }}</h2>
        <div class="mt-4 grid gap-6 lg:grid-cols-2">
          <section v-for="g in facetGroups" :key="g.group">
            <h3 class="font-medium">{{ t(`attributeGroup.${g.group}`) }}</h3>
            <ul class="mt-2 divide-y divide-line rounded-[var(--radius-control)] border border-line">
              <li v-for="a in g.items" :key="a.id" class="flex flex-wrap items-center gap-2 px-3 py-2 text-[0.9375rem]" :class="{ 'opacity-60': !a.active }">
                <span class="flex-1">
                  {{ label(a.translations) }}
                  <UiBadge v-if="!a.active">{{ t('admin.inactive') }}</UiBadge>
                </span>
                <span v-if="a.categories" class="text-xs text-muted">{{ t('admin.onlyFor', { list: a.categories.map(categoryName).join(', ') }) }}</span>
                <span class="text-xs text-muted">{{ t('admin.usedBy', { n: usage(a) }) }}</span>
              </li>
            </ul>
          </section>
        </div>
      </UiCard>
    </div>
  </div>
</template>
