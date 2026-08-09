import { describe, expect, it } from 'vitest';

import { getFeaturePath } from './feature-path';

describe('getFeaturePath', () => {
  it('builds a nested Feature URL from backend public keys', () => {
    expect(getFeaturePath('PRJ-204', 'FEAT-5831')).toBe(
      '/projects/PRJ-204/features/FEAT-5831',
    );
  });
});
