import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/shared/api';

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry(failureCount, error) {
          if (
            error instanceof ApiError &&
            error.status >= 400 &&
            error.status < 500
          ) {
            return false;
          }

          return failureCount < 1;
        },
      },
    },
  });
}
