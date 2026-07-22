import { describe, expect, it } from 'vitest';

import { ApiError } from '@/shared/api';

import { createAppQueryClient } from './query-client';

describe('createAppQueryClient', () => {
  it('keeps inactive data for thirty minutes and disables focus refetching', () => {
    const options = createAppQueryClient().getDefaultOptions().queries;

    expect(options?.gcTime).toBe(30 * 60 * 1000);
    expect(options?.refetchOnWindowFocus).toBe(false);
  });

  it('retries network and server failures once but never retries 4xx errors', () => {
    const retry = createAppQueryClient().getDefaultOptions().queries?.retry;

    expect(retry).toBeTypeOf('function');
    if (typeof retry !== 'function') return;

    expect(retry(0, new Error('Offline'))).toBe(true);
    expect(retry(1, new Error('Offline'))).toBe(false);
    expect(retry(0, new ApiError('Missing', 404, null))).toBe(false);
    expect(retry(0, new ApiError('Unavailable', 503, null))).toBe(true);
  });
});
