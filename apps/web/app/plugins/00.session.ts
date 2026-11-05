/** Resolve the session once during SSR (or on first client load) and remember the language choice. */
export default defineNuxtPlugin(async (nuxtApp) => {
  const auth = useAuthStore();
  if (!auth.loaded) await auth.fetch();

  const i18n = nuxtApp.$i18n as { locale: Ref<string>; onLanguageSwitched?: unknown };
  const cookie = useCookie('carely_locale', { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', path: '/' });
  // Persist the language of every explicitly visited /hy, /ru or /en URL.
  watch(
    () => i18n.locale.value,
    (l) => {
      if (cookie.value !== l) cookie.value = l;
    },
    { immediate: true },
  );
});
