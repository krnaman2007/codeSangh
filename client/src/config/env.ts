const metaEnv = (import.meta as { env?: Record<string, unknown> }).env ?? {};
const rawApiBase = typeof metaEnv.VITE_API_BASE_URL === 'string' ? metaEnv.VITE_API_BASE_URL.trim() : '';
const rawSocketUrl = typeof metaEnv.VITE_SOCKET_URL === 'string' ? metaEnv.VITE_SOCKET_URL.trim() : '';

export const clientEnv = {
  apiBaseUrl: rawApiBase ? rawApiBase.replace(/\/+$/, '') : '/api/v1',
  socketUrl: rawSocketUrl ? rawSocketUrl.replace(/\/+$/, '') : '',
  isDev: Boolean(metaEnv.DEV),
} as const;
