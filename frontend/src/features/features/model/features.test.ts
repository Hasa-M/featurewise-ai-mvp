import { describe, expect, it } from 'vitest';

import { featureKeys, toFeature } from './features';

describe('feature model', () => {
  it('uses stable collection and detail keys', () => {
    expect(featureKeys.list('project-1')).toEqual(['features', 'project-1']);
    expect(featureKeys.detail('feature-1')).toEqual([
      'feature',
      'feature-1',
    ]);
  });

  it('maps the backend response without changing domain labels', () => {
    const feature = toFeature({
      alignment: { pendingUpdates: [], status: 'updates_pending' },
      brief: null,
      createdAt: '2026-07-18T10:00:00.000Z',
      createdById: 'user-1',
      id: 'feature-1',
      includeInProjectContext: false,
      origin: 'brand_new',
      projectId: 'project-1',
      title: 'Authentication',
      updatedAt: '2026-07-18T11:00:00.000Z',
    });

    expect(feature.alignment.status).toBe('updates_pending');
    expect(feature.origin).toBe('brand_new');
    expect(feature.createdAt).toBeInstanceOf(Date);
  });
});
