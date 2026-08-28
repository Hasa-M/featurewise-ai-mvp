import { z } from 'zod';

export const featureCreateSchema = z.object({
  specificationContent: z.string().max(
    2000,
    'Use 2,000 characters or fewer.',
  ),
  title: z.string().trim().min(1, 'Enter a feature title.').max(
    180,
    'Use 180 characters or fewer.',
  ),
});

export const featureQuickEditSchema = z.object({
  title: z.string().trim().min(1, 'Enter a feature title.').max(
    180,
    'Use 180 characters or fewer.',
  ),
});

export const featureSpecificationSchema = z.object({
  specificationContent: z.string().max(
    2000,
    'Use 2,000 characters or fewer.',
  ),
});

export type FeatureCreateValues = z.infer<typeof featureCreateSchema>;
export type FeatureQuickEditValues = z.infer<typeof featureQuickEditSchema>;
export type FeatureSpecificationValues = z.infer<
  typeof featureSpecificationSchema
>;
