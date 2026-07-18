import { z } from 'zod';

export const loginFormSchema = z.object({
  password: z
    .string()
    .min(1, 'Enter your password.')
    .max(1000, 'Password must be 1000 characters or fewer.'),
  username: z
    .string()
    .trim()
    .min(1, 'Enter your username.')
    .max(100, 'Username must be 100 characters or fewer.'),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
