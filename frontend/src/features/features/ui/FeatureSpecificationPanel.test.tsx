import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Feature } from '../model/features';
import { FeatureSpecificationPanel } from './FeatureSpecificationPanel';

const { mutateAsync } = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}));

vi.mock('../model/features', () => ({
  useUpdateFeature: () => ({
    error: null,
    isError: false,
    isPending: false,
    mutateAsync,
  }),
}));

const feature: Feature = {
  createdAt: new Date('2026-08-28T10:00:00.000Z'),
  createdByKey: 'USR-7',
  projectKey: 'PRJ-204',
  publicKey: 'FEAT-5831',
  specificationContent: 'Original specification',
  title: 'Saved views',
  updatedAt: new Date('2026-08-28T10:00:00.000Z'),
};

describe('FeatureSpecificationPanel', () => {
  it('saves only the canonical specification field', async () => {
    mutateAsync.mockImplementation(async (input: Record<string, unknown>) => ({
      ...feature,
      specificationContent: input.specificationContent as string,
    }));
    const user = userEvent.setup();

    render(
      <FeatureSpecificationPanel
        accessToken='access-token'
        feature={feature}
      />,
    );

    const specification = screen.getByLabelText('Feature specification');
    const save = screen.getByRole('button', { name: 'Save specification' });
    expect(specification).toHaveValue('Original specification');
    expect(save).toBeDisabled();

    await user.clear(specification);
    await user.type(specification, 'Updated specification');
    await user.click(save);

    expect(mutateAsync).toHaveBeenCalledWith({
      featureKey: 'FEAT-5831',
      specificationContent: 'Updated specification',
    });
    expect(await screen.findByText('Specification is saved')).toBeVisible();
  });
});
