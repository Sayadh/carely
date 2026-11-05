/** The Carely team phone from runtime config, formatted for display (+374 XX XXX XXX) and as a tel: link. */
export function useSupportPhone() {
  const raw = String(useRuntimeConfig().public.supportPhone || '').replace(/[^\d+]/g, '');
  if (!raw) return null;
  const m = /^\+374(\d{2})(\d{3})(\d{3})$/.exec(raw);
  return { href: `tel:${raw}`, display: m ? `+374 ${m[1]} ${m[2]} ${m[3]}` : raw };
}
