import { describe, expect, it } from 'vitest';

import type { TreePageDto } from '../api';
import {
  flattenBranchPages,
  flattenRepositoryPages,
  flattenTreePages,
  nextPageNumber,
  nextTreePageParameter,
  availableRepositoriesQueryOptions,
} from './repository-context';

describe('repository context pagination', () => {
  it('keeps repository caches separate between verified accounts and attempts', () => {
    const first = availableRepositoriesQueryOptions(
      'token',
      'PRJ-1',
      true,
      '10',
      'first',
    );
    const otherAccount = availableRepositoriesQueryOptions(
      'token',
      'PRJ-1',
      true,
      '20',
      'first',
    );
    const newAttempt = availableRepositoriesQueryOptions(
      'token',
      'PRJ-1',
      true,
      '10',
      'second',
    );
    expect(first.queryKey).not.toEqual(otherAccount.queryKey);
    expect(first.queryKey).not.toEqual(newAttempt.queryKey);
  });
  it('flattens and deterministically deduplicates repository and branch pages', () => {
    expect(
      flattenRepositoryPages([
        {
          items: [repository('2', 'z/repository')],
          page: 1,
          pageSize: 100,
          hasNextPage: true,
        },
        {
          items: [repository('1', 'a/repository'), repository('2', 'changed')],
          page: 2,
          pageSize: 100,
          hasNextPage: false,
        },
      ]).map((item) => item.repositoryId),
    ).toEqual(['1', '2']);
    expect(
      flattenBranchPages([
        {
          items: [branch('release', 'b'), branch('main', 'a')],
          page: 1,
          pageSize: 100,
          hasNextPage: true,
        },
        {
          items: [branch('main', 'changed'), branch('third', 'c')],
          page: 2,
          pageSize: 100,
          hasNextPage: false,
        },
      ]).map((item) => `${item.name}:${item.commitSha}`),
    ).toEqual(['main:a', 'release:b', 'third:c']);
    expect(
      nextPageNumber({ items: [], page: 2, pageSize: 100, hasNextPage: true }),
    ).toBe(3);
    expect(
      nextPageNumber({ items: [], page: 3, pageSize: 100, hasNextPage: false }),
    ).toBeUndefined();
  });

  it('pins later directory pages to the first page commit and deduplicates paths', () => {
    const first = treePage(1, 'a'.repeat(40), true, ['z.ts', 'a.ts']);
    const second = treePage(2, 'a'.repeat(40), true, ['a.ts', 'm.ts']);
    const third = treePage(3, 'a'.repeat(40), false, ['third.ts']);

    expect(nextTreePageParameter(second, [first, second])).toEqual({
      page: 3,
      commitSha: 'a'.repeat(40),
    });
    expect(
      flattenTreePages([first, second, third]).map((item) => item.path),
    ).toEqual(['a.ts', 'm.ts', 'third.ts', 'z.ts']);
  });
});

function repository(repositoryId: string, fullName: string) {
  return {
    repositoryId,
    owner: fullName.split('/')[0] ?? 'owner',
    name: fullName.split('/')[1] ?? 'repository',
    fullName,
    private: false,
    defaultBranch: 'main',
  };
}

function branch(name: string, commitSha: string) {
  return { name, commitSha };
}

function treePage(
  page: number,
  commitSha: string,
  hasNextPage: boolean,
  paths: readonly string[],
): TreePageDto {
  return {
    branch: 'main',
    commitSha,
    path: '',
    page,
    pageSize: 100,
    hasNextPage,
    items: paths.map((path) => ({
      path,
      name: path,
      kind: 'file',
      sizeBytes: 1,
      selectable: true,
      disabledReason: null,
    })),
  };
}
