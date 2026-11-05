export interface ToastItem {
  id: number;
  kind: 'success' | 'error' | 'info';
  message: string;
}

let next = 1;

export function useToast() {
  const items = useState<ToastItem[]>('toasts', () => []);
  function push(kind: ToastItem['kind'], message: string, ms = 5000) {
    const id = next++;
    items.value = [...items.value, { id, kind, message }];
    if (import.meta.client) setTimeout(() => dismiss(id), ms);
  }
  function dismiss(id: number) {
    items.value = items.value.filter((t) => t.id !== id);
  }
  return {
    items,
    dismiss,
    success: (m: string) => push('success', m),
    error: (m: string) => push('error', m, 8000),
    info: (m: string) => push('info', m),
  };
}
