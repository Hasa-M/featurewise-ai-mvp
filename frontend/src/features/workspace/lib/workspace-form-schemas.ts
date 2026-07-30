import { z } from 'zod';

export const organizationEditSchema = z.object({
  name: z.string().trim().min(1, 'Enter an organization name.').max(
    120,
    'Use 120 characters or fewer.',
  ),
});

export const projectEditSchema = z.object({
  name: z.string().trim().min(1, 'Enter a project name.').max(
    120,
    'Use 120 characters or fewer.',
  ),
});

export type OrganizationEditValues = z.infer<typeof organizationEditSchema>;
export type ProjectEditValues = z.infer<typeof projectEditSchema>;

