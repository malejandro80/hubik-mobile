export interface HttpResponse<T> {
  ok: boolean;
  status: number;
  data: T | null;
  errorText?: string;
}

export interface HttpRequestOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export async function httpPostJson<T = unknown>(
  url: string,
  body: unknown,
  options?: HttpRequestOptions
): Promise<HttpResponse<T>> {
  const controller = new AbortController();
  const timer = options?.timeoutMs ? setTimeout(() => controller.abort(), options.timeoutMs) : undefined;

  if (options?.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers ?? {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      return { ok: false, status: res.status, data: null, errorText };
    }

    const data = (await res.json()) as T;
    return { ok: true, status: res.status, data };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function httpPostFormData<T = unknown>(
  url: string,
  formData: FormData,
  options?: HttpRequestOptions
): Promise<HttpResponse<T>> {
  const controller = new AbortController();
  const timer = options?.timeoutMs ? setTimeout(() => controller.abort(), options.timeoutMs) : undefined;

  if (options?.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: options?.headers,
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      return { ok: false, status: res.status, data: null, errorText };
    }

    const data = (await res.json()) as T;
    return { ok: true, status: res.status, data };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
