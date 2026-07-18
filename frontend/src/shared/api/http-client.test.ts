import { describe, expect, it, vi } from 'vitest';

import { request } from './http-client';

describe('request', () => {
  it('returns a JSON response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'feature-1' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(request<{ id: string }>('/features/feature-1')).resolves.toEqual(
      { id: 'feature-1' },
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/features/feature-1',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it('returns undefined for an empty response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(request<void>('/features/feature-1', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('normalizes API errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: ['Name is required'] }), {
          headers: { 'Content-Type': 'application/json' },
          status: 422,
        }),
      ),
    );

    const result = request('/features', { body: {}, method: 'POST' });

    await expect(result).rejects.toMatchObject({
      message: 'Name is required',
      name: 'ApiError',
      status: 422,
    });
  });
});
