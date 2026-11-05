import { ApiError } from './useApi';

/** Multipart upload with progress (XHR), same CSRF header as other mutations. */
export function useUpload() {
  const progress = ref<number | null>(null);
  function upload<T>(url: string, file: File): Promise<T> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const fd = new FormData();
      fd.append('file', file);
      xhr.open('POST', `/api${url}`);
      xhr.setRequestHeader('x-carely-csrf', '1');
      xhr.withCredentials = true;
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) progress.value = Math.round((e.loaded / e.total) * 100);
      };
      xhr.onload = () => {
        progress.value = null;
        let body: any = null;
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          /* empty */
        }
        if (xhr.status >= 200 && xhr.status < 300) resolve(body as T);
        else reject(new ApiError(xhr.status, body?.error?.code ?? (xhr.status === 413 ? 'FILE_TOO_LARGE' : 'INTERNAL'), body?.error?.params));
      };
      xhr.onerror = () => {
        progress.value = null;
        reject(new ApiError(0, 'INTERNAL'));
      };
      xhr.send(fd);
    });
  }
  return { progress, upload };
}
