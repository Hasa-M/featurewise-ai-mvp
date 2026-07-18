import { describe, expect, it } from 'vitest';

import { loginFormSchema } from './login-form-schema';

describe('loginFormSchema', () => {
  it('requires both credentials', () => {
    const result = loginFormSchema.safeParse({
      password: '',
      username: '   ',
    });

    expect(result.success).toBe(false);

    if (result.success) {
      return;
    }

    expect(result.error.flatten().fieldErrors).toMatchObject({
      password: ['Enter your password.'],
      username: ['Enter your username.'],
    });
  });

  it('trims the username while preserving the password', () => {
    expect(
      loginFormSchema.parse({
        password: ' password with spaces ',
        username: '  marco  ',
      }),
    ).toEqual({
      password: ' password with spaces ',
      username: 'marco',
    });
  });

  it('enforces the backend transport length constraints', () => {
    const result = loginFormSchema.safeParse({
      password: 'p'.repeat(1001),
      username: 'u'.repeat(101),
    });

    expect(result.success).toBe(false);

    if (result.success) {
      return;
    }

    expect(result.error.flatten().fieldErrors).toMatchObject({
      password: ['Password must be 1000 characters or fewer.'],
      username: ['Username must be 100 characters or fewer.'],
    });
  });
});
