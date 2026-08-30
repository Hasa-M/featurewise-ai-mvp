import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { contextKeys, useUpdateProjectContext } from './context';

const mocks = vi.hoisted(() => ({
  updateProjectContext: vi.fn(),
}));

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  updateProjectContext: mocks.updateProjectContext,
}));

describe('ProjectContext query behavior', () => {
  beforeEach(() => {
    mocks.updateProjectContext.mockReset();
  });

  it('updates only the exact ProjectContext cache entry after saving', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    });
    const originalOtherContext = { publicKey: 'PCTX-99', content: 'Other' };
    const originalProject = { publicKey: 'PRJ-204', name: 'Northstar' };
    queryClient.setQueryData(
      contextKeys.projectDetail('PRJ-999'),
      originalOtherContext,
    );
    queryClient.setQueryData(['project', 'PRJ-204'], originalProject);
    mocks.updateProjectContext.mockResolvedValue({
      content: 'Shared project rules',
      createdAt: '2026-08-29T10:00:00.000Z',
      projectKey: 'PRJ-204',
      publicKey: 'PCTX-31',
      updatedAt: '2026-08-29T11:00:00.000Z',
    });
    const wrapper = ({ children }: { readonly children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
    const { result } = renderHook(
      () => useUpdateProjectContext('access-token', 'PRJ-204'),
      { wrapper },
    );

    await act(async () => {
      await result.current.mutateAsync('Shared project rules');
    });

    expect(mocks.updateProjectContext).toHaveBeenCalledWith(
      'access-token',
      'PRJ-204',
      'Shared project rules',
    );
    expect(
      queryClient.getQueryData(contextKeys.projectDetail('PRJ-204')),
    ).toEqual({
      content: 'Shared project rules',
      createdAt: new Date('2026-08-29T10:00:00.000Z'),
      projectKey: 'PRJ-204',
      publicKey: 'PCTX-31',
      updatedAt: new Date('2026-08-29T11:00:00.000Z'),
    });
    expect(
      queryClient.getQueryData(contextKeys.projectDetail('PRJ-999')),
    ).toBe(originalOtherContext);
    expect(queryClient.getQueryData(['project', 'PRJ-204'])).toBe(
      originalProject,
    );
  });
});
