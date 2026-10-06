export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new HttpError(payload.error || 'Não foi possível concluir a operação.', response.status);
  }

  return payload as T;
}
