import { describe, expect, it } from 'vitest';

import { contextKeys, toProjectContext } from './context';

describe('context model', () => {
  it('uses separate stable Feature and Project context keys', () => {
    expect(contextKeys.detail('FEAT-5831')).toEqual([
      'feature-context',
      'FEAT-5831',
    ]);
    expect(contextKeys.projectDetail('PRJ-204')).toEqual([
      'project-context',
      'PRJ-204',
    ]);
  });

  it('maps ProjectContext lifecycle timestamps at the feature boundary', () => {
    const context = toProjectContext({
      content: 'Shared project rules',
      createdAt: '2026-08-29T10:00:00.000Z',
      projectKey: 'PRJ-204',
      publicKey: 'PCTX-31',
      updatedAt: '2026-08-29T11:00:00.000Z',
    });

    expect(context).toEqual({
      content: 'Shared project rules',
      createdAt: new Date('2026-08-29T10:00:00.000Z'),
      projectKey: 'PRJ-204',
      publicKey: 'PCTX-31',
      updatedAt: new Date('2026-08-29T11:00:00.000Z'),
    });
  });
});
