export default defineEventHandler((event) => {
  const { public: cfg } = useRuntimeConfig(event);
  setHeader(event, 'content-type', 'text/plain; charset=utf-8');
  const lines = ['User-agent: *'];
  for (const l of ['hy', 'ru', 'en']) {
    for (const p of ['account', 'pro', 'admin', 'auth', 'requests']) lines.push(`Disallow: /${l}/${p}`);
  }
  // Keep crawlers off unbounded filter combinations; category/location pages remain crawlable.
  lines.push('Disallow: /*?*page=', 'Disallow: /*?*priceMin=', 'Disallow: /*?*languages=', 'Disallow: /*?*attributes=', 'Disallow: /*?*date=', 'Disallow: /api/');
  lines.push(`Sitemap: ${cfg.siteUrl.replace(/\/$/, '')}/sitemap.xml`);
  return lines.join('\n') + '\n';
});
