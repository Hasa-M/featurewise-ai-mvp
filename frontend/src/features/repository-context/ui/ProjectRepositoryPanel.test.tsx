import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RepositoryState } from '../api';
import { ProjectRepositoryPanel } from './ProjectRepositoryPanel';

let repositoryState: RepositoryState = 'integration_disabled';

const connection = {
  publicKey: 'REPO-1',
  repositoryId: '9007199254740993',
  owner: 'featurewise',
  name: 'private-repository',
  fullName: 'featurewise/private-repository',
  private: true,
  defaultBranch: 'main',
  baseBranch: 'main',
  status: 'connected',
  lastCheckedAt: '2026-08-31T12:00:00.000Z',
  rateLimitResetAt: null,
  lastErrorCode: null,
  lastErrorMessage: null,
  createdAt: '2026-08-31T12:00:00.000Z',
  updatedAt: '2026-08-31T12:00:00.000Z',
};

const fetchMoreRepositories = vi.fn();
const fetchMoreBranches = vi.fn();

vi.mock('../model', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../model')>()),
  useProjectRepository: () => ({
    data: {
      state: repositoryState,
      connection: ['connected', 'inaccessible', 'rate_limited'].includes(repositoryState)
        ? { ...connection, status: repositoryState }
        : undefined,
    },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useAvailableRepositories: () => ({
    data: {
      pages: [
        { items: [{ repositoryId: '1', owner: 'org', name: 'one', fullName: 'org/one', private: false, defaultBranch: 'main' }], page: 1, pageSize: 100, hasNextPage: true },
        { items: [{ repositoryId: '2', owner: 'org', name: 'two', fullName: 'org/two', private: false, defaultBranch: 'main' }], page: 2, pageSize: 100, hasNextPage: true },
        { items: [{ repositoryId: '3', owner: 'org', name: 'three', fullName: 'org/three', private: true, defaultBranch: 'main' }], page: 3, pageSize: 100, hasNextPage: false },
      ],
    },
    isPending: false,
    hasNextPage: true,
    isFetchingNextPage: false,
    fetchNextPage: fetchMoreRepositories,
  }),
  useBranches: () => ({
    data: {
      pages: [
        { items: [{ name: 'main', commitSha: 'a'.repeat(40) }], page: 1, pageSize: 100, hasNextPage: true },
        { items: [{ name: 'release', commitSha: 'b'.repeat(40) }], page: 2, pageSize: 100, hasNextPage: true },
        { items: [{ name: 'third-page', commitSha: 'c'.repeat(40) }], page: 3, pageSize: 100, hasNextPage: false },
      ],
    },
    hasNextPage: true,
    isFetchingNextPage: false,
    fetchNextPage: fetchMoreBranches,
  }),
  useRepositoryMutations: () => ({
    attempt: { isPending: false, mutateAsync: vi.fn() },
    connect: { isPending: false, mutate: vi.fn() },
    updateBranch: { isPending: false, mutateAsync: vi.fn() },
    disconnect: { isPending: false, mutateAsync: vi.fn() },
  }),
}));

describe('ProjectRepositoryPanel states', () => {
  beforeEach(() => {
    repositoryState = 'integration_disabled';
    fetchMoreRepositories.mockClear();
    fetchMoreBranches.mockClear();
  });

  it.each([
    ['integration_disabled', 'GitHub integration is disabled'],
    ['disconnected', 'Connect a GitHub repository'],
    ['connecting', 'Connecting to GitHub'],
    ['repository_selection', 'Select a repository'],
    ['connected', 'featurewise/private-repository'],
    ['inaccessible', 'featurewise/private-repository'],
    ['rate_limited', 'featurewise/private-repository'],
  ] as const)('renders %s', (state, heading) => {
    repositoryState = state;
    render(<ProjectRepositoryPanel accessToken='token' projectKey='PRJ-1' />);
    expect(screen.getByRole('heading', { name: heading })).toBeVisible();
  });

  it('explains the disconnect consequence before confirmation', async () => {
    repositoryState = 'connected';
    render(<ProjectRepositoryPanel accessToken='token' projectKey='PRJ-1' />);
    screen.getByRole('button', { name: 'Disconnect' }).click();
    expect(await screen.findByText(/selected paths will be deleted/i)).toBeVisible();
    expect(screen.getByText(/will not be uninstalled/i)).toBeVisible();
  });

  it('flattens later repository pages and loads more only on request', async () => {
    const user = userEvent.setup();
    repositoryState = 'repository_selection';
    render(<ProjectRepositoryPanel accessToken='token' projectKey='PRJ-1' />);

    await user.click(screen.getByRole('combobox', { name: 'Repository' }));
    expect(screen.getByRole('option', { name: /org\/three/ })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Load more repositories' }));
    expect(fetchMoreRepositories).toHaveBeenCalledTimes(1);
  });

  it('flattens later branch pages and exposes a manual load action', async () => {
    const user = userEvent.setup();
    repositoryState = 'connected';
    render(<ProjectRepositoryPanel accessToken='token' projectKey='PRJ-1' />);

    await user.click(screen.getByRole('combobox', { name: 'Project base branch' }));
    expect(screen.getByRole('option', { name: 'third-page' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Load more branches' }));
    expect(fetchMoreBranches).toHaveBeenCalledTimes(1);
  });
});
