import { describe, expect, it } from 'vitest';

import {
  adjustProjectFeatureCount,
  projectKeys,
  toProject,
  toProjectSummary,
} from './projects';

describe('project model', () => {
  it('uses stable collection and detail keys', () => {
    expect(projectKeys.list('organization-1')).toEqual([
      'projects',
      'organization-1',
    ]);
    expect(projectKeys.detail('project-1')).toEqual([
      'project',
      'project-1',
    ]);
  });

  it('maps transport timestamps at the feature boundary', () => {
    const project = toProject({
      createdAt: '2026-07-18T10:00:00.000Z',
      id: 'project-1',
      name: 'Northstar',
      organizationId: 'organization-1',
      publicKey: 'PRJ-204',
      updatedAt: '2026-07-18T11:00:00.000Z',
    });

    expect(project.createdAt).toEqual(new Date('2026-07-18T10:00:00.000Z'));
    expect(project.publicKey).toBe('PRJ-204');
    expect(project.updatedAt).toEqual(new Date('2026-07-18T11:00:00.000Z'));
  });

  it('maps project summaries with their active feature count', () => {
    const project = toProjectSummary({
      createdAt: '2026-07-18T10:00:00.000Z',
      featureCount: 3,
      id: 'project-1',
      name: 'Northstar',
      organizationId: 'organization-1',
      publicKey: 'PRJ-204',
      updatedAt: '2026-07-18T11:00:00.000Z',
    });

    expect(project.featureCount).toBe(3);
    expect(project.createdAt).toEqual(new Date('2026-07-18T10:00:00.000Z'));
  });

  it('adjusts cached feature counts without allowing negative values', () => {
    const project = toProjectSummary({
      createdAt: '2026-07-18T10:00:00.000Z',
      featureCount: 1,
      id: 'project-1',
      name: 'Northstar',
      organizationId: 'organization-1',
      publicKey: 'PRJ-204',
      updatedAt: '2026-07-18T11:00:00.000Z',
    });

    const incremented = adjustProjectFeatureCount(
      [project],
      project.id,
      1,
    );
    const decremented = adjustProjectFeatureCount(
      incremented,
      project.id,
      -3,
    );

    expect(incremented?.[0]?.featureCount).toBe(2);
    expect(decremented?.[0]?.featureCount).toBe(0);
  });
});
