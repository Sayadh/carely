/** Sitemap with per-language alternates. Only published (approved) profiles and static public pages are listed. */
export default defineEventHandler(async (event) => {
  const { apiInternalUrl, public: cfg } = useRuntimeConfig(event);
  const site = cfg.siteUrl.replace(/\/$/, '');
  const locales = ['hy', 'ru', 'en'];
  const pages = ['', '/professionals', '/how-it-works', '/trust', '/become-a-professional', '/faq', '/contact', '/about'];
  let profiles: { slug: string; updatedAt: string }[] = [];
  try {
    profiles = await $fetch<{ slug: string; updatedAt: string }[]>(`${apiInternalUrl}/api/professionals/sitemap`);
  } catch {
    profiles = [];
  }
  const cats = ['childcare', 'elderly-care', 'patient-care', 'pet-care'];
  const entries: { path: string; lastmod?: string }[] = [
    ...pages.map((p) => ({ path: p })),
    ...cats.map((c) => ({ path: `/professionals?category=${c}` })),
    ...profiles.map((p) => ({ path: `/professionals/${p.slug}`, lastmod: p.updatedAt })),
  ];
  const esc = (s: string) => s.replace(/&/g, '&amp;');
  const body = entries
    .flatMap((e) =>
      locales.map(
        (l) =>
          `<url><loc>${esc(`${site}/${l}${e.path}`)}</loc>${e.lastmod ? `<lastmod>${e.lastmod.slice(0, 10)}</lastmod>` : ''}${locales
            .map((alt) => `<xhtml:link rel="alternate" hreflang="${alt}" href="${esc(`${site}/${alt}${e.path}`)}"/>`)
            .join('')}<xhtml:link rel="alternate" hreflang="x-default" href="${esc(`${site}/hy${e.path}`)}"/></url>`,
      ),
    )
    .join('');
  setHeader(event, 'content-type', 'application/xml; charset=utf-8');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${body}</urlset>`;
});
