<script setup lang="ts">
import { Globe } from 'lucide-vue-next';
/** Keeps the equivalent page and its query (filters). Unfinished forms are restored from session drafts. */
const { locale, locales, t } = useI18n();
const switchLocalePath = useSwitchLocalePath();
const route = useRoute();
defineProps<{ compact?: boolean }>();
const list = computed(() => (locales.value as { code: string; name: string }[]).map((l) => ({ code: l.code, name: l.name })));
const open = ref(false);
function target(code: string) {
  const path = switchLocalePath(code as any) || `/${code}`;
  const q = new URLSearchParams(route.query as Record<string, string>).toString();
  return q && !path.includes('?') ? `${path}?${q}` : path;
}
</script>

<template>
  <div class="relative" @focusout="(e: FocusEvent) => !(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node) && (open = false)">
    <button
      type="button"
      class="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-[0.9375rem] text-ink hover:bg-bg"
      :aria-expanded="open"
      aria-haspopup="true"
      :aria-label="t('nav.language')"
      @click="open = !open"
    >
      <Globe class="size-4 text-muted" aria-hidden="true" />
      <span>{{ list.find((l) => l.code === locale)?.name }}</span>
    </button>
    <ul v-show="open" class="absolute right-0 z-40 mt-1 w-44 rounded-[var(--radius-control)] border border-line bg-surface py-1 shadow-[var(--shadow-pop)]">
      <li v-for="l in list" :key="l.code">
        <NuxtLink
          :to="target(l.code)"
          :lang="l.code"
          :hreflang="l.code"
          class="flex min-h-10 items-center px-3 text-[0.9375rem] hover:bg-bg"
          :class="l.code === locale ? 'font-semibold text-primary' : ''"
          :aria-current="l.code === locale ? 'true' : undefined"
          @click="open = false"
        >
          {{ l.name }}
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
