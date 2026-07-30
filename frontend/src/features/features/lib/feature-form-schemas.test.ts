import { describe, expect, it } from 'vitest';

import {
  featureCreateSchema,
  featureQuickEditSchema,
} from './feature-form-schemas';

describe('feature form schemas', () => {
  it('requires an explicit origin during creation', () => {
    expect(featureCreateSchema.safeParse({ title: 'Saved views' }).success).toBe(
      false,
    );
    expect(
      featureCreateSchema.parse({ origin: 'brand_new', title: ' Saved views ' }),
    ).toEqual({ origin: 'brand_new', title: 'Saved views' });
  });

  it('accepts only the bounded quick-edit fields', () => {
    const result = featureQuickEditSchema.parse({
      brief: 'Return to useful filters.',
      includeInProjectContext: true,
      origin: 'mapped_existing',
      schemaVersion: 'v99',
      title: 'Saved views',
    });

    expect(result).toEqual({
      brief: 'Return to useful filters.',
      includeInProjectContext: true,
      title: 'Saved views',
    });
  });
});

