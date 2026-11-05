const LOCALES = ['hy', 'ru', 'en'];

/** The bare domain opens Armenian unless the visitor previously chose another language. Browser language is ignored. */
export default defineEventHandler((event) => {
  const url = getRequestURL(event);
  if (url.pathname !== '/') return;
  const saved = getCookie(event, 'carely_locale');
  const locale = saved && LOCALES.includes(saved) ? saved : 'hy';
  return sendRedirect(event, `/${locale}${url.search}`, 302);
});
