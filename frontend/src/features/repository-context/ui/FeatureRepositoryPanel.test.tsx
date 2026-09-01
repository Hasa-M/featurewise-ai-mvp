import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RepositoryState } from '../api';
import { FeatureRepositoryPanel } from './FeatureRepositoryPanel';

let repositoryState: RepositoryState = 'connected';
const update = vi.fn().mockResolvedValue(undefined);
const connectedContextData = {
  state: 'connected' as const,
  featureKey: 'FEAT-1',
  repositoryKey: 'REPO-1',
  fullName: 'featurewise/private-repository',
  branchOverride: null,
  effectiveBranch: 'main',
  baseBranch: 'main',
  defaultBranch: 'main',
  selectedFiles: [],
};
let treeCommitSha = 'a'.repeat(40);
const fetchMoreTree = vi.fn();
const fetchMoreBranches = vi.fn();

vi.mock('../model', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../model')>()),
  useFeatureRepositoryContext: () => ({
    data: repositoryState === 'connected'
      ? connectedContextData
      : { state: repositoryState, featureKey: 'FEAT-1' },
    isPending: false,
    isError: false,
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
  useRepositoryTree: (...args: unknown[]) => {
    const path = String(args[4] ?? '');
    return {
      data: {
        pages: path ? [{ branch: 'main', commitSha: treeCommitSha, path, page: 1, pageSize: 100, hasNextPage: false, items: [] }] : [
        { branch: 'main', commitSha: treeCommitSha, path: '', page: 1, pageSize: 100, hasNextPage: true, items: [
          { path: 'docs', name: 'docs', kind: 'directory' as const, sizeBytes: null, selectable: false, disabledReason: null },
          { path: 'src/index.ts', name: 'index.ts', kind: 'file' as const, sizeBytes: 1024, selectable: true, disabledReason: null },
          { path: 'link', name: 'link', kind: 'file' as const, sizeBytes: 10, selectable: false, disabledReason: 'symlink' },
        ] },
        { branch: 'main', commitSha: treeCommitSha, path: '', page: 2, pageSize: 100, hasNextPage: true, items: [{ path: 'src/second.ts', name: 'second.ts', kind: 'file' as const, sizeBytes: 10, selectable: true, disabledReason: null }] },
        { branch: 'main', commitSha: treeCommitSha, path: '', page: 3, pageSize: 100, hasNextPage: false, items: [{ path: 'src/third.ts', name: 'third.ts', kind: 'file' as const, sizeBytes: 10, selectable: true, disabledReason: null }] },
        ],
      },
      isPending: false,
      isError: false,
      hasNextPage: !path,
      isFetchingNextPage: false,
      fetchNextPage: fetchMoreTree,
    };
  },
  useUpdateFeatureRepositoryContext: () => ({
    mutateAsync: update,
    isPending: false,
  }),
}));

describe('FeatureRepositoryPanel', () => {
  beforeEach(() => {
    repositoryState = 'connected';
    update.mockClear();
    treeCommitSha = 'a'.repeat(40);
    fetchMoreTree.mockClear();
    fetchMoreBranches.mockClear();
  });

  it.each([
    ['integration_disabled', 'GitHub integration is disabled'],
    ['disconnected', 'Connect a Project repository first'],
    ['inaccessible', 'Repository is currently unavailable'],
    ['rate_limited', 'Repository is currently unavailable'],
  ] as const)('renders the %s state', (state, heading) => {
    repositoryState = state;
    render(<FeatureRepositoryPanel accessToken='token' featureKey='FEAT-1' projectKey='PRJ-1' />);
    expect(screen.getByRole('heading', { name: heading })).toBeVisible();
  });

  it('shows inheritance, disabled reasons, search, and bounded selection', async () => {
    const user = userEvent.setup();
    render(<FeatureRepositoryPanel accessToken='token' featureKey='FEAT-1' projectKey='PRJ-1' />);

    expect(screen.getByRole('radio', { name: /Inherit Project branch/ })).toBeChecked();
    expect(screen.getByText('symlink')).toBeVisible();
    const allowed = screen.getByRole('checkbox', { name: 'index.ts' });
    await user.click(allowed);
    expect(screen.getByText(/1\/50 files/)).toBeVisible();
    expect(screen.getByText('src/index.ts')).toBeVisible();

    await user.type(screen.getByRole('searchbox', { name: 'Search loaded repository paths' }), 'index');
    expect(screen.getByRole('checkbox', { name: 'src/index.ts' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Save repository context' }));
    expect(update).toHaveBeenCalledWith({
      branchOverride: null,
      selectedPaths: ['src/index.ts'],
    });
  });

  it('shows third tree/branch pages and fetches more only through accessible actions', async () => {
    const user = userEvent.setup();
    render(<FeatureRepositoryPanel accessToken='token' featureKey='FEAT-1' projectKey='PRJ-1' />);

    expect(screen.getByRole('checkbox', { name: 'third.ts' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Load more repository files' }));
    expect(fetchMoreTree).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('radio', { name: 'Override for this Feature' }));
    await user.click(screen.getByRole('combobox', { name: 'Feature branch' }));
    expect(screen.getByRole('option', { name: 'third-page' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Load more branches' }));
    expect(fetchMoreBranches).toHaveBeenCalledTimes(1);
  });

  it('resets loaded search and open directories when the resolved commit changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<FeatureRepositoryPanel accessToken='token' featureKey='FEAT-1' projectKey='PRJ-1' />);
    await user.click(screen.getByRole('button', { name: 'docs' }));
    expect(screen.getByRole('button', { name: 'docs' })).toHaveAttribute('aria-expanded', 'true');
    await user.type(screen.getByRole('searchbox', { name: 'Search loaded repository paths' }), 'index');

    treeCommitSha = 'd'.repeat(40);
    rerender(<FeatureRepositoryPanel accessToken='token' featureKey='FEAT-1' projectKey='PRJ-1' />);

    await waitFor(() => expect(screen.getByRole('searchbox', { name: 'Search loaded repository paths' })).toHaveValue(''));
    expect(screen.getByRole('button', { name: 'docs' })).toHaveAttribute('aria-expanded', 'false');
  });
});
