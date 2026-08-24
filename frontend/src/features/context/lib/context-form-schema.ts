import { z } from 'zod';

export const contextPromptSchema = z.object({
  promptContent: z
    .string()
    .max(20000, 'Use 20,000 characters or fewer.'),
});

export type ContextPromptValues = z.infer<typeof contextPromptSchema>;
