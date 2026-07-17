import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Radio, RadioCard, RadioGroup } from './RadioGroup';

describe('RadioGroup', () => {
  it('allows only one radio to be selected', async () => {
    const user = userEvent.setup();

    render(
      <RadioGroup defaultValue="feature" label="Spec target">
        <Radio label="Feature" value="feature" />
        <Radio label="Feature update" value="update" />
      </RadioGroup>,
    );
    const feature = screen.getByRole('radio', { name: 'Feature' });
    const update = screen.getByRole('radio', { name: 'Feature update' });

    expect(feature).toBeChecked();
    expect(update).not.toBeChecked();

    await user.click(update);

    expect(feature).not.toBeChecked();
    expect(update).toBeChecked();
  });

  it('reports value changes in controlled mode', async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();

    render(
      <RadioGroup
        label="Spec target"
        onValueChange={onValueChange}
        value="feature"
      >
        <Radio label="Feature" value="feature" />
        <Radio label="Feature update" value="update" />
      </RadioGroup>,
    );

    await user.click(screen.getByRole('radio', { name: 'Feature update' }));

    expect(onValueChange).toHaveBeenCalledWith('update');
    expect(screen.getByRole('radio', { name: 'Feature' })).toBeChecked();
  });

  it('clears an optional selection through the clear action', async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();

    render(
      <RadioGroup
        clearable
        defaultValue="ready"
        label="Readiness filter"
        onValueChange={onValueChange}
      >
        <Radio label="Ready" value="ready" />
        <Radio label="Blocked" value="blocked" />
      </RadioGroup>,
    );

    await user.click(screen.getByRole('button', { name: 'Clear selection' }));

    expect(screen.getByRole('radio', { name: 'Ready' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Blocked' })).not.toBeChecked();
    expect(onValueChange).toHaveBeenCalledWith(null);
    expect(
      screen.queryByRole('button', { name: 'Clear selection' }),
    ).not.toBeInTheDocument();
  });

  it('associates card descriptions with their radio inputs', () => {
    render(
      <RadioGroup label="Spec target">
        <RadioCard
          description="Create a readiness spec for a brand-new feature."
          label="New feature"
          value="new"
        />
      </RadioGroup>,
    );

    expect(
      screen.getByRole('radio', { name: 'New feature' }),
    ).toHaveAccessibleDescription(
      'Create a readiness spec for a brand-new feature.',
    );
  });

  it('provides an accessible group name and description', () => {
    render(
      <RadioGroup
        description="Choose the target that matches the product intent."
        label="Spec target"
      >
        <Radio label="Feature" value="feature" />
      </RadioGroup>,
    );

    expect(screen.getByRole('group', { name: 'Spec target' })).toHaveAccessibleDescription(
      'Choose the target that matches the product intent.',
    );
  });

  it('does not change selection when the group is disabled', async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();

    render(
      <RadioGroup
        defaultValue="feature"
        disabled
        label="Spec target"
        onValueChange={onValueChange}
      >
        <Radio label="Feature" value="feature" />
        <Radio label="Feature update" value="update" />
      </RadioGroup>,
    );

    await user.click(screen.getByRole('radio', { name: 'Feature update' }));

    expect(screen.getByRole('radio', { name: 'Feature' })).toBeChecked();
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
