import { describe, expect, it } from 'vitest';

import { featureKeys, toFeature } from './features';

describe('feature model', () => {
  it('uses stable collection and detail keys', () => {
    expect(featureKeys.list('project-1')).toEqual(['features', 'project-1']);
    expect(featureKeys.detail('project-1', 'feature-1')).toEqual([
      'feature',
      'project-1',
      'feature-1',
    ]);
  });

  it('maps the backend response without changing domain labels', () => {
    const feature = toFeature({
      activity: {
        currentValidSpecVersion: 2,
        generationRunCount: 3,
        latestFeatureRun: {
          runKind: 'generation',
          status: 'completed',
          usedProjectContext: true,
        },
      },
      alignment: { pendingUpdates: [], status: 'updates_pending' },
      brief: null,
      createdAt: '2026-07-18T10:00:00.000Z',
      createdById: 'user-1',
      id: 'feature-1',
      includeInProjectContext: false,
      origin: 'brand_new',
      projectId: 'project-1',
      publicKey: 'FEAT-5831',
      title: 'Authentication',
      updatedAt: '2026-07-18T11:00:00.000Z',
    });

    expect(feature.activity.generationRunCount).toBe(3);
    expect(feature.activity.latestFeatureRun?.usedProjectContext).toBe(true);
    expect(feature.alignment.status).toBe('updates_pending');
    expect(feature.origin).toBe('brand_new');
    expect(feature.publicKey).toBe('FEAT-5831');
    expect(feature.createdAt).toBeInstanceOf(Date);
  });
});
