import { apiClient } from './client';
import type { ApiUser } from './types';

export interface AuthCredentialsResponse {
  user: ApiUser;
  accessToken: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export const authApi = {
  register: (input: RegisterInput, signal?: AbortSignal) =>
    apiClient.post<AuthCredentialsResponse>('/auth/register', input, {
      signal,
      skipAuth: true,
    }),

  login: (input: LoginInput, signal?: AbortSignal) =>
    apiClient.post<AuthCredentialsResponse>('/auth/login', input, {
      signal,
      skipAuth: true,
    }),

  refresh: (signal?: AbortSignal) =>
    apiClient.post<AuthCredentialsResponse>('/auth/refresh', undefined, {
      signal,
      skipAuth: true,
      skipRefreshRetry: true,
    }),

  me: (signal?: AbortSignal) => apiClient.get<{ user: ApiUser }>('/auth/me', { signal }),

  logout: () => apiClient.post<void>('/auth/logout', undefined, { skipRefreshRetry: true }),
};
