import { describe, expect, it } from 'vitest';

import { contextContentSchema } from './context-form-schema';

describe('context content schema', () => {
  it('accepts empty supporting context and enforces the transport limit', () => {
    expect(contextContentSchema.parse({ content: '' })).toEqual({
      content: '',
    });
    expect(
      contextContentSchema.safeParse({ content: 'x'.repeat(20001) }).success,
    ).toBe(false);
  });
});
