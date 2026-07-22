import { describe, expect, it } from 'vitest';

import { projectKeys, toProject } from './projects';

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
      updatedAt: '2026-07-18T11:00:00.000Z',
    });

    expect(project.createdAt).toEqual(new Date('2026-07-18T10:00:00.000Z'));
    expect(project.updatedAt).toEqual(new Date('2026-07-18T11:00:00.000Z'));
  });
});
