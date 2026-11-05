import type { LocationDto } from '@carely/shared';
import type { ComboboxOption } from '~/components/ui/Combobox.vue';

/**
 * Combobox options as a region → towns/districts tree (`parent` = region value). Regions render collapsed.
 * Optionally restricted to a set of ids (a service area also covers everything inside it).
 */
export function useLocationOptions(restrictTo?: Ref<string[] | null | undefined>, valueKey: 'slug' | 'id' = 'slug') {
  const { locations } = useTaxonomy();
  const { tx } = useFormat();
  return computed<ComboboxOption[]>(() => {
    const all = locations.value ?? [];
    const allowed = restrictTo?.value ? expand(all, restrictTo.value) : null;
    const ok = (l: LocationDto) => !allowed || allowed.has(l.id);
    const out: ComboboxOption[] = [];
    for (const r of all.filter((l) => l.type === 'REGION')) {
      const kids = all.filter((l) => l.parentId === r.id && ok(l));
      if (ok(r)) out.push({ value: r[valueKey], label: tx(r.name) });
      // Children keep their region as parent and hint; if the region itself is not selectable they are listed flat.
      for (const k of kids) out.push({ value: k[valueKey], label: tx(k.name), hint: tx(r.name), parent: r[valueKey] });
    }
    return out;
  });
}

function expand(all: LocationDto[], ids: string[]) {
  const set = new Set(ids);
  let grew = true;
  while (grew) {
    grew = false;
    for (const l of all) if (l.parentId && set.has(l.parentId) && !set.has(l.id)) (set.add(l.id), (grew = true));
  }
  return set;
}
