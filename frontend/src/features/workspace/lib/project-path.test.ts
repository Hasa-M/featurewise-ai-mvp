import { describe, expect, it } from 'vitest';

import { getProjectPath } from './project-path';

describe('getProjectPath', () => {
  it('builds a Project URL from the backend public key', () => {
    expect(getProjectPath('PRJ-204')).toBe('/projects/PRJ-204');
  });
});
