import { describe, expect, it } from 'vitest';

import type { FeatureDto } from '../api';
import { featureKeys, toFeature } from './features';

describe('feature model', () => {
  it('uses stable collection and detail keys', () => {
    expect(featureKeys.list('PRJ-1')).toEqual(['features', 'PRJ-1']);
    expect(featureKeys.detail('PRJ-1', 'FEAT-1')).toEqual([
      'feature',
      'PRJ-1',
      'FEAT-1',
    ]);
  });

  it('maps only the specification-analysis contract from the backend response', () => {
    const dto = {
      activity: { generationRunCount: 3 },
      alignment: { pendingUpdates: [], status: 'updates_pending' },
      brief: null,
      createdAt: '2026-07-18T10:00:00.000Z',
      createdByKey: 'USR-1',
      includeInProjectContext: false,
      origin: 'brand_new',
      projectKey: 'PRJ-204',
      publicKey: 'FEAT-5831',
      specificationContent: 'Users can save filter configurations.',
      title: 'Authentication',
      updatedAt: '2026-07-18T11:00:00.000Z',
    } as FeatureDto & Record<string, unknown>;
    const feature = toFeature(dto);

    expect(feature.publicKey).toBe('FEAT-5831');
    expect(feature.specificationContent).toBe(
      'Users can save filter configurations.',
    );
    expect(feature.createdAt).toBeInstanceOf(Date);
    expect(feature).not.toHaveProperty('brief');
    expect(feature).not.toHaveProperty('origin');
    expect(feature).not.toHaveProperty('includeInProjectContext');
    expect(feature).not.toHaveProperty('activity');
    expect(feature).not.toHaveProperty('alignment');
  });
});
