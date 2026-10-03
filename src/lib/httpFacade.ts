export async function fetchBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  if (response.ok === false) {
    throw new Error(`Failed to fetch resource at ${uri}: ${response.status}`);
  }
  return response.blob();
}

export async function postJson<T = unknown>(
  url: string,
  body: unknown,
  headers?: Record<string, string>
): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error((data as any)?.error ?? `HTTP ${response.status}`);
  }
  return data as T;
}
