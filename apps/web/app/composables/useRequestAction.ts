/**
 * What the global "Send request" button does on the current page. A page with its own request form (a profile, the
 * request page) registers a handler while mounted; elsewhere the button opens the general request page.
 */
export function useRequestAction() {
  const handler = useState<(() => void) | null>('carely:request-action', () => null);
  function register(fn: () => void) {
    onMounted(() => (handler.value = fn));
    onBeforeUnmount(() => {
      if (handler.value === fn) handler.value = null;
    });
  }
  return { handler, register };
}

/** Scroll a form into view and focus its first field (used by request-form pages). */
export function focusForm(el: HTMLElement | null | undefined) {
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.querySelector<HTMLInputElement>('input:not([type=hidden]):not([tabindex="-1"])')?.focus({ preventScroll: true });
}
