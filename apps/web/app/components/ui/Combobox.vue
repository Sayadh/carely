<script setup lang="ts">
import { Check, ChevronDown, ChevronRight, X } from 'lucide-vue-next';

/**
 * Accessible searchable single-select (WAI-ARIA combobox with listbox popup).
 *
 * Tree mode: options with `parent` are grouped under their parent option. Groups start collapsed; clicking a group
 * expands it and offers "<group> — whole" plus its children. Typing switches to a flat filtered list.
 *
 * The popup is teleported (to the nearest open <dialog>, else <body>) and positioned with `fixed`, so it is never
 * clipped by `overflow` or hidden under later stacking contexts (hero, cards, drawers).
 */
export interface ComboboxOption {
  value: string;
  label: string;
  hint?: string;
  /** Value of the parent option (tree mode). */
  parent?: string;
}

const model = defineModel<string | undefined>();
const props = defineProps<{
  label?: string;
  placeholder?: string;
  error?: string;
  help?: string;
  options: ComboboxOption[];
  clearable?: boolean;
  hideLabel?: boolean;
}>();
const { t } = useI18n();
const id = useId();
const listId = `${id}-list`;
const query = ref('');
const open = ref(false);
const active = ref(0);
const input = ref<HTMLInputElement | null>(null);
const anchor = ref<HTMLElement | null>(null);
const list = ref<HTMLElement | null>(null);
const expanded = ref(new Set<string>());

type Row =
  | { kind: 'group'; key: string; value: string; label: string; open: boolean }
  | { kind: 'option'; key: string; value: string; label: string; hint?: string; indent: boolean };

const selected = computed(() => props.options.find((o) => o.value === model.value));
const childrenOf = computed(() => {
  const map = new Map<string, ComboboxOption[]>();
  for (const o of props.options) if (o.parent) map.set(o.parent, [...(map.get(o.parent) ?? []), o]);
  return map;
});
const norm = (s: string) => s.toLocaleLowerCase().normalize('NFKD');

const rows = computed<Row[]>(() => {
  const q = norm(query.value.trim());
  if (q) {
    // Search: flat list of every matching selectable option.
    return props.options
      .filter((o) => norm(o.label).includes(q) || norm(o.hint ?? '').includes(q))
      .map((o) => ({ kind: 'option', key: o.value, value: o.value, label: o.label, hint: o.hint, indent: false }));
  }
  const out: Row[] = [];
  for (const o of props.options.filter((x) => !x.parent)) {
    const kids = childrenOf.value.get(o.value) ?? [];
    if (!kids.length) {
      out.push({ kind: 'option', key: o.value, value: o.value, label: o.label, hint: o.hint, indent: false });
      continue;
    }
    const isOpen = expanded.value.has(o.value);
    out.push({ kind: 'group', key: `g:${o.value}`, value: o.value, label: o.label, open: isOpen });
    if (!isOpen) continue;
    out.push({ kind: 'option', key: o.value, value: o.value, label: t('common.wholeArea', { name: o.label }), indent: true });
    for (const k of kids) out.push({ kind: 'option', key: k.value, value: k.value, label: k.label, indent: true });
  }
  // Children whose parent is not an option (restricted lists) are listed on their own.
  const roots = new Set(props.options.filter((x) => !x.parent).map((x) => x.value));
  for (const o of props.options) if (o.parent && !roots.has(o.parent)) out.push({ kind: 'option', key: o.value, value: o.value, label: o.label, hint: o.hint, indent: false });
  return out;
});

watch(selected, (s) => {
  if (!open.value) query.value = s?.label ?? '';
}, { immediate: true });

// ── Popup placement (fixed, follows the input on scroll/resize; flips up when there is no room below) ──
const teleportTo = ref<string | HTMLElement>('body');
const pos = ref({ left: 0, width: 0, top: 0 as number | null, bottom: null as number | null, maxHeight: 288 });
function place() {
  const el = anchor.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const below = window.innerHeight - r.bottom - 12;
  const above = r.top - 12;
  const up = below < 220 && above > below;
  pos.value = {
    left: r.left,
    width: r.width,
    top: up ? null : r.bottom + 4,
    bottom: up ? window.innerHeight - r.top + 4 : null,
    maxHeight: Math.max(160, Math.min(288, up ? above : below)),
  };
}
const popupStyle = computed(() => ({
  left: `${pos.value.left}px`,
  width: `${pos.value.width}px`,
  top: pos.value.top != null ? `${pos.value.top}px` : undefined,
  bottom: pos.value.bottom != null ? `${pos.value.bottom}px` : undefined,
  maxHeight: `${pos.value.maxHeight}px`,
}));
let raf = 0;
const onViewportChange = () => {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(place);
};
watch(open, (isOpen) => {
  if (!import.meta.client) return;
  if (isOpen) {
    teleportTo.value = (anchor.value?.closest('dialog') as HTMLElement | null) ?? 'body';
    place();
    window.addEventListener('scroll', onViewportChange, true);
    window.addEventListener('resize', onViewportChange);
  } else {
    window.removeEventListener('scroll', onViewportChange, true);
    window.removeEventListener('resize', onViewportChange);
  }
});
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onViewportChange, true);
  window.removeEventListener('resize', onViewportChange);
  cancelAnimationFrame(raf);
});

function scrollActiveIntoView() {
  nextTick(() => document.getElementById(`${id}-opt-${active.value}`)?.scrollIntoView({ block: 'nearest' }));
}
function openList() {
  open.value = true;
  query.value = '';
  // Reveal the current selection inside its collapsed group.
  const parent = selected.value?.parent;
  if (parent) expanded.value = new Set([...expanded.value, parent]);
  active.value = Math.max(0, rows.value.findIndex((r) => r.kind === 'option' && r.value === model.value));
  scrollActiveIntoView();
}
function toggleGroup(value: string) {
  const next = new Set(expanded.value);
  const opening = !next.has(value);
  opening ? next.add(value) : next.delete(value);
  expanded.value = next;
  if (opening) {
    // Bring the newly revealed "whole area" row into view (groups near the bottom would otherwise open off-screen).
    const groupIndex = rows.value.findIndex((r) => r.kind === 'group' && r.value === value);
    nextTick(() => document.getElementById(`${id}-opt-${groupIndex + 1}`)?.scrollIntoView({ block: 'nearest' }));
  }
}
function choose(v: string) {
  model.value = v;
  open.value = false;
  query.value = props.options.find((o) => o.value === v)?.label ?? '';
}
function activate(row: Row | undefined) {
  if (!row) return;
  if (row.kind === 'group') toggleGroup(row.value);
  else choose(row.value);
}
function close() {
  open.value = false;
  query.value = selected.value?.label ?? '';
}
function onKey(e: KeyboardEvent) {
  if (!open.value && (e.key === 'ArrowDown' || e.key === 'Enter')) {
    openList();
    e.preventDefault();
    return;
  }
  const row = rows.value[active.value];
  if (e.key === 'ArrowDown') active.value = Math.min(rows.value.length - 1, active.value + 1);
  else if (e.key === 'ArrowUp') active.value = Math.max(0, active.value - 1);
  else if (e.key === 'ArrowRight' && row?.kind === 'group' && !row.open) toggleGroup(row.value);
  else if (e.key === 'ArrowLeft' && row?.kind === 'group' && row.open) toggleGroup(row.value);
  else if (e.key === 'Enter') activate(row);
  else if (e.key === 'Escape') close();
  else return;
  e.preventDefault();
  scrollActiveIntoView();
}
function clear() {
  model.value = undefined;
  query.value = '';
  input.value?.focus();
}
function onFocusOut(e: FocusEvent) {
  const next = e.relatedTarget as Node | null;
  if (anchor.value?.contains(next) || list.value?.contains(next)) return;
  close();
}
</script>

<template>
  <UiField :id="id" :label="label" :error="error" :help="help">
    <div ref="anchor" class="relative" @focusout="onFocusOut">
      <input
        :id="id"
        ref="input"
        v-model="query"
        role="combobox"
        :aria-label="hideLabel ? label : undefined"
        :aria-expanded="open"
        :aria-controls="listId"
        aria-autocomplete="list"
        :aria-activedescendant="open && rows.length ? `${id}-opt-${active}` : undefined"
        :placeholder="placeholder"
        autocomplete="off"
        class="control pr-16"
        :aria-invalid="!!error || undefined"
        @focus="openList"
        @click="!open && openList()"
        @input="(open = true), (active = 0)"
        @keydown="onKey"
      />
      <div class="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 text-muted">
        <button v-if="clearable && model" type="button" class="rounded p-1 hover:bg-bg" :aria-label="t('common.clear')" @click="clear"><X class="size-4" /></button>
        <ChevronDown class="size-4 transition-transform" :class="{ 'rotate-180': open }" aria-hidden="true" />
      </div>
    </div>
    <ClientOnly>
      <Teleport :to="teleportTo">
        <ul
          v-show="open"
          :id="listId"
          ref="list"
          role="listbox"
          tabindex="-1"
          :style="popupStyle"
          class="fixed z-[70] overflow-auto overscroll-contain rounded-[var(--radius-control)] border border-line bg-surface py-1 shadow-[var(--shadow-pop)]"
          @mousedown.prevent
        >
          <li v-if="!rows.length" class="px-3 py-2 text-sm text-muted">{{ t('common.noMatches') }}</li>
          <li
            v-for="(r, i) in rows"
            :id="`${id}-opt-${i}`"
            :key="r.key"
            role="option"
            :aria-selected="r.kind === 'option' && r.value === model"
            :aria-expanded="r.kind === 'group' ? r.open : undefined"
            class="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-[0.9375rem]"
            :class="[i === active ? 'bg-primary-soft' : '', r.kind === 'group' ? 'font-medium' : r.indent ? 'pl-8' : 'font-medium']"
            @click="activate(r)"
            @mousemove="active = i"
          >
            <span class="flex min-w-0 items-center gap-1.5">
              <ChevronRight v-if="r.kind === 'group'" class="size-4 shrink-0 text-muted transition-transform" :class="{ 'rotate-90': r.open }" aria-hidden="true" />
              <span class="truncate">{{ r.label }}</span>
              <span v-if="r.kind === 'option' && r.hint" class="ml-1 shrink-0 text-sm font-normal text-muted">{{ r.hint }}</span>
            </span>
            <Check v-if="r.kind === 'option' && r.value === model" class="size-4 shrink-0 text-primary" aria-hidden="true" />
          </li>
        </ul>
      </Teleport>
    </ClientOnly>
  </UiField>
</template>
