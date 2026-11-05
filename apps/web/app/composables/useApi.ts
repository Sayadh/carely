import type { ApiErrorBody, ErrorCode } from '@carely/shared';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    public params?: Record<string, string | number>,
    public fields?: Record<string, string[]>,
    public requestId?: string,
  ) {
    super(code);
  }
}

type Opts = { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: any; query?: Record<string, any> };

/** Typed fetch wrapper for the same-origin /api proxy. On the server it forwards the visitor's cookies. */
export function useApi() {
  // Loosely typed on purpose: Nitro's typed-route inference over the /api/** proxy is too deep for vue-tsc.
  const fetcher = (import.meta.server ? useRequestFetch() : $fetch) as unknown as (url: string, opts: Record<string, unknown>) => Promise<unknown>;
  return async function api<T = unknown>(path: string, opts: Opts = {}): Promise<T> {
    try {
      return (await fetcher(`/api${path}`, {
        method: opts.method ?? 'GET',
        body: opts.body,
        query: opts.query,
        headers: { 'x-carely-csrf': '1' },
        credentials: 'same-origin',
      })) as T;
    } catch (e: any) {
      const body = e?.data as ApiErrorBody | undefined;
      const status = e?.response?.status ?? e?.statusCode ?? 0;
      if (body?.error?.code) throw new ApiError(status, body.error.code, body.error.params, body.error.fields, body.error.requestId);
      throw new ApiError(status, status === 0 ? 'INTERNAL' : 'INTERNAL');
    }
  };
}

/** Translate an API error into a user-facing message. */
export function useErrorMessage() {
  const { t, te } = useI18n();
  return (e: unknown) => {
    if (e instanceof ApiError) {
      const key = `errors.${e.code}`;
      return te(key) ? t(key, e.params ?? {}) : t('errors.INTERNAL');
    }
    return t('errors.NETWORK');
  };
}

/** Field errors keyed by field name, translated from stable validation codes. */
export function useFieldErrors() {
  const { t, te } = useI18n();
  const errors = ref<Record<string, string>>({});
  function set(e: unknown) {
    errors.value = {};
    if (e instanceof ApiError && e.fields) {
      for (const [k, codes] of Object.entries(e.fields)) {
        const code = codes[0];
        errors.value[k] = te(`validation.${code}`) ? t(`validation.${code}`) : t('validation.invalid');
      }
    }
  }
  function fromZod(issues: { path: PropertyKey[]; message: string }[]) {
    errors.value = {};
    for (const i of issues) {
      const k = i.path.map(String).join('.');
      if (errors.value[k]) continue;
      errors.value[k] = te(`validation.${i.message}`) ? t(`validation.${i.message}`) : t('validation.invalid');
    }
  }
  return { errors, set, fromZod, clear: () => (errors.value = {}) };
}
