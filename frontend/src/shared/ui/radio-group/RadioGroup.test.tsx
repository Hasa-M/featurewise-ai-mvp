import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Radio, RadioCard, RadioGroup } from './RadioGroup';

describe('RadioGroup', () => {
  it('allows only one radio to be selected', async () => {
    const user = userEvent.setup();

    render(
      <RadioGroup defaultValue="specification" label="Analysis source">
        <Radio label="Specification" value="specification" />
        <Radio label="Supporting context" value="context" />
      </RadioGroup>,
    );
    const feature = screen.getByRole('radio', { name: 'Specification' });
    const update = screen.getByRole('radio', { name: 'Supporting context' });

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
        label="Analysis source"
        onValueChange={onValueChange}
        value="specification"
      >
        <Radio label="Specification" value="specification" />
        <Radio label="Supporting context" value="context" />
      </RadioGroup>,
    );

    await user.click(screen.getByRole('radio', { name: 'Supporting context' }));

    expect(onValueChange).toHaveBeenCalledWith('context');
    expect(screen.getByRole('radio', { name: 'Specification' })).toBeChecked();
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
      <RadioGroup label="Analysis source">
        <RadioCard
          description="Analyze the feature specification as the primary source."
          label="Specification"
          value="specification"
        />
      </RadioGroup>,
    );

    expect(
      screen.getByRole('radio', { name: 'Specification' }),
    ).toHaveAccessibleDescription(
      'Analyze the feature specification as the primary source.',
    );
  });

  it('provides an accessible group name and description', () => {
    render(
      <RadioGroup
        description="Choose the target that matches the product intent."
        label="Analysis source"
      >
        <Radio label="Feature" value="feature" />
      </RadioGroup>,
    );

    expect(screen.getByRole('group', { name: 'Analysis source' })).toHaveAccessibleDescription(
      'Choose the target that matches the product intent.',
    );
  });

  it('does not change selection when the group is disabled', async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();

    render(
      <RadioGroup
        defaultValue="specification"
        disabled
        label="Analysis source"
        onValueChange={onValueChange}
      >
        <Radio label="Specification" value="specification" />
        <Radio label="Supporting context" value="context" />
      </RadioGroup>,
    );

    await user.click(screen.getByRole('radio', { name: 'Supporting context' }));

    expect(screen.getByRole('radio', { name: 'Specification' })).toBeChecked();
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
