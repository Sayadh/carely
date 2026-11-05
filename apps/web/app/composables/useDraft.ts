/**
 * Unfinished form data kept in sessionStorage so it survives language switches,
 * sign-in redirects and accidental navigation. Never used for secrets.
 */
export function useDraft<T extends object>(key: string, initial: () => T) {
  const state = ref(initial()) as Ref<T>;
  const storageKey = `carely:draft:${key}`;
  if (import.meta.client) {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) state.value = { ...initial(), ...JSON.parse(raw) };
    } catch {
      /* storage unavailable */
    }
    watch(
      state,
      (v) => {
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(v));
        } catch {
          /* ignore */
        }
      },
      { deep: true },
    );
  }
  function clear() {
    state.value = initial();
    if (import.meta.client) {
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
    }
  }
  return { state, clear };
}

/** Only allow internal, same-origin paths as post-login redirects. */
export function safeRedirect(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || /[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}
