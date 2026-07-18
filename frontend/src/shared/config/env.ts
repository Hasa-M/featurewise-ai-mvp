const defaultApiBaseUrl = '/api';

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL?.trim() || defaultApiBaseUrl,
} as const;
