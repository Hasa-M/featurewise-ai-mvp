import { z } from 'zod';

export const featureCreateSchema = z.object({
  origin: z.enum(['brand_new', 'mapped_existing'], {
    error: 'Choose whether the feature is new or already exists.',
  }),
  title: z.string().trim().min(1, 'Enter a feature title.').max(
    180,
    'Use 180 characters or fewer.',
  ),
});

export const featureQuickEditSchema = z.object({
  brief: z.string().max(2000, 'Use 2,000 characters or fewer.'),
  includeInProjectContext: z.boolean(),
  title: z.string().trim().min(1, 'Enter a feature title.').max(
    180,
    'Use 180 characters or fewer.',
  ),
});

export type FeatureCreateValues = z.infer<typeof featureCreateSchema>;
export type FeatureQuickEditValues = z.infer<typeof featureQuickEditSchema>;

