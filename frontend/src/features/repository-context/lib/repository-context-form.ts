import { z } from 'zod';

export const featureRepositoryContextSchema = z.object({
  branchMode: z.enum(['inherit', 'override']),
  branchOverride: z.string(),
  selectedPaths: z.array(z.string()).max(50),
});

export type FeatureRepositoryContextForm = z.infer<typeof featureRepositoryContextSchema>;
