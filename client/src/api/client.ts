import { clientEnv } from '../config/env';
import { ApiClientError, normalizeApiErrorPayload, toApiClientError } from './errors';
import type { ApiEnvelope, ApiUser } from './types';

let inMemoryAccessToken: string | null = null;
let refreshPromise: Promise<{ accessToken: string; user: ApiUser } | null> | null = null;
let onUnauthorizedHandler: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorizedHandler = handler;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  skipAuth?: boolean;
  skipRefreshRetry?: boolean;
}

function buildUrl(
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>
): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const base = `${clientEnv.apiBaseUrl}${cleanPath}`;
  if (!query) return base;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function refreshSessionToken(): Promise<{ accessToken: string; user: ApiUser } | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        setAccessToken(null);
        return null;
      }
      const payload = (await parseJsonSafe(response)) as ApiEnvelope<{
        accessToken: string;
        user: ApiUser;
      }> | null;
      if (payload && payload.success && payload.data?.accessToken) {
        setAccessToken(payload.data.accessToken);
        return { accessToken: payload.data.accessToken, user: payload.data.user };
      }
      setAccessToken(null);
      return null;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    query,
    signal,
    headers = {},
    skipAuth = false,
    skipRefreshRetry = false,
  } = options;

  const url = buildUrl(path, query);
  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (!skipAuth && inMemoryAccessToken) {
    requestHeaders.Authorization = `Bearer ${inMemoryAccessToken}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      credentials: 'include',
      signal,
      headers: requestHeaders,
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
          ? body
          : JSON.stringify(body),
    });
  } catch (err) {
    throw toApiClientError(err);
  }

  // Single-flight silent refresh on 401
  if (response.status === 401 && !skipAuth && !skipRefreshRetry && !path.startsWith('/auth/')) {
    const refreshed = await refreshSessionToken();
    if (refreshed?.accessToken) {
      return apiRequest<T>(path, { ...options, skipRefreshRetry: true });
    }
    onUnauthorizedHandler?.();
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await parseJsonSafe(response)) as ApiEnvelope<T> | null;

  if (!response.ok) {
    throw normalizeApiErrorPayload(response.status, payload, response.statusText);
  }

  if (payload && typeof payload === 'object' && 'success' in payload) {
    if (payload.success) {
      return payload.data;
    }
    throw normalizeApiErrorPayload(response.status, payload);
  }

  return payload as T;
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};

export { ApiClientError };
