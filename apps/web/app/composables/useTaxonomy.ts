import { ATTRIBUTE_GROUPS, type AttributeDto, type AttributeGroup, type CategoryDto, type LocationDto } from '@carely/shared';

/** Categories, services, facets and locations (cached in the SSR payload). */
export function useTaxonomy() {
  const api = useApi();
  const categories = useState<CategoryDto[] | null>('tx:categories', () => null);
  const attributes = useState<AttributeDto[] | null>('tx:attributes', () => null);
  const locations = useState<LocationDto[] | null>('tx:locations', () => null);

  async function load() {
    if (categories.value && attributes.value && locations.value) return;
    const [c, a, l] = await Promise.all([api<CategoryDto[]>('/taxonomy/categories'), api<AttributeDto[]>('/taxonomy/attributes'), api<LocationDto[]>('/taxonomy/locations')]);
    categories.value = c;
    attributes.value = a;
    locations.value = l;
  }

  /** Global facets grouped for display; options restricted to other categories are hidden. Without a category, all options show. */
  function facetGroups(categorySlug?: string | null): { group: AttributeGroup; items: AttributeDto[] }[] {
    const visible = (attributes.value ?? []).filter((a) => !a.categories || !categorySlug || a.categories.includes(categorySlug));
    return ATTRIBUTE_GROUPS.map((group) => ({ group, items: visible.filter((a) => a.group === group) })).filter((g) => g.items.length);
  }

  const regions = computed(() => (locations.value ?? []).filter((l) => l.type === 'REGION'));
  const childrenOf = (id: string) => (locations.value ?? []).filter((l) => l.parentId === id);
  const locationBySlug = (slug?: string | null) => (locations.value ?? []).find((l) => l.slug === slug);
  const locationById = (id?: string | null) => (locations.value ?? []).find((l) => l.id === id);
  const categoryBySlug = (slug?: string | null) => (categories.value ?? []).find((c) => c.slug === slug);
  const categoryById = (id?: string | null) => (categories.value ?? []).find((c) => c.id === id);
  const allServices = computed(() => (categories.value ?? []).flatMap((c) => c.services));

  return { categories, attributes, locations, load, facetGroups, regions, childrenOf, locationBySlug, locationById, categoryBySlug, categoryById, allServices };
}
