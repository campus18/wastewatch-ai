const KEY = 'ww_token';
const configuredApiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
const normalizedApiBase = configuredApiBase.replace(/\/+$/, '');
const API_ORIGIN = normalizedApiBase.endsWith('/api')
  ? normalizedApiBase.slice(0, -4)
  : normalizedApiBase;
const API_BASE = `${API_ORIGIN}/api`;

export function assetUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (/^(https?:)?\/\//i.test(path) || /^(blob:|data:)/i.test(path)) return path;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_ORIGIN}${normalizedPath}`;
  // Force browsers that cached the earlier 404s to request restored uploads again.
  return normalizedPath.startsWith('/uploads/')
    ? `${url}${url.includes('?') ? '&' : '?'}v=restored-20261014`
    : url;
}

export const getToken = () => localStorage.getItem(KEY);

export const setToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(KEY, token);
  } else {
    localStorage.removeItem(KEY);
  }
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Record<string, string>
  ) {
    super(message);
  }
}

let onUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

async function request(
  path: string,
  opts: { method?: string; body?: unknown; form?: FormData }
): Promise<Response> {
  const headers: Record<string, string> = {};
  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form;
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  try {
    return await fetch(`${API_BASE}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body,
    });
  } catch {
    throw new ApiError(
      0,
      'Cannot reach the server. Check your connection and that the API is running.'
    );
  }
}

export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown; form?: FormData } = {}
): Promise<T> {
  const res = await request(path, opts);
  const data = await res.json().catch(() => null);

  if (res.status === 401 && getToken() && !path.startsWith('/auth/')) {
    onUnauthorized?.();
  }

  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.error ?? `Request failed (${res.status})`,
      data?.details
    );
  }

  return data as T;
}

/** Fetch an authenticated image as an object URL. */
export async function apiImageUrl(path: string): Promise<string> {
  const res = await request(path, {});

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(
      res.status,
      data?.error ?? `Request failed (${res.status})`
    );
  }

  return URL.createObjectURL(await res.blob());
}
