const metaEnv = (import.meta as { env?: Record<string, unknown> }).env ?? {};

function readFlag(key: string, defaultValue: boolean): boolean {
  const val = metaEnv[key];
  if (val === 'true') return true;
  if (val === 'false') return false;
  return defaultValue;
}

export const featureFlags = {
  terminalSocket: readFlag('VITE_FEATURE_TERMINAL_SOCKET', true),
  debug: readFlag('VITE_FEATURE_DEBUG', true),
  git: readFlag('VITE_FEATURE_GIT', true),
  environment: readFlag('VITE_FEATURE_ENVIRONMENT', true),
  voice: readFlag('VITE_FEATURE_VOICE', true),
  aiAssistant: readFlag('VITE_FEATURE_AI', true),
} as const;
