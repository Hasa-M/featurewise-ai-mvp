import { z } from 'zod';

export const contextContentSchema = z.object({
  content: z.string().max(20000, 'Use 20,000 characters or fewer.'),
});

export type ContextContentValues = z.infer<typeof contextContentSchema>;
