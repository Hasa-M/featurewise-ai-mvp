import { describe, expect, it } from 'vitest';

import {
  featureCreateSchema,
  featureQuickEditSchema,
  featureSpecificationSchema,
} from './feature-form-schemas';

describe('feature form schemas', () => {
  it('accepts only title and specification content during creation', () => {
    expect(
      featureCreateSchema.parse({
        brief: 'Legacy brief',
        includeInProjectContext: true,
        origin: 'brand_new',
        specificationContent: 'Acceptance criteria',
        title: ' Saved views ',
      }),
    ).toEqual({
      specificationContent: 'Acceptance criteria',
      title: 'Saved views',
    });
  });

  it('keeps quick edit limited to the title', () => {
    const result = featureQuickEditSchema.parse({
      brief: 'Return to useful filters.',
      includeInProjectContext: true,
      origin: 'mapped_existing',
      schemaVersion: 'v99',
      specificationContent: 'Canonical specification',
      title: ' Saved views ',
    });

    expect(result).toEqual({ title: 'Saved views' });
  });

  it('bounds the canonical specification independently', () => {
    expect(
      featureSpecificationSchema.safeParse({
        specificationContent: 'x'.repeat(2001),
      }).success,
    ).toBe(false);
  });
});
