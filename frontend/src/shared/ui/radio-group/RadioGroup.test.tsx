import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Radio, RadioCard, RadioGroup } from './RadioGroup';

describe('RadioGroup', () => {
  it('allows only one radio to be selected', async () => {
    const user = userEvent.setup();

    render(
      <RadioGroup defaultValue="list" label="Layout">
        <Radio label="List" value="list" />
        <Radio label="Cards" value="cards" />
      </RadioGroup>,
    );
    const list = screen.getByRole('radio', { name: 'List' });
    const cards = screen.getByRole('radio', { name: 'Cards' });

    expect(list).toBeChecked();
    expect(cards).not.toBeChecked();

    await user.click(cards);

    expect(list).not.toBeChecked();
    expect(cards).toBeChecked();
  });

  it('reports value changes in controlled mode', async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();

    render(
      <RadioGroup
        label="Layout"
        onValueChange={onValueChange}
        value="list"
      >
        <Radio label="List" value="list" />
        <Radio label="Cards" value="cards" />
      </RadioGroup>,
    );

    await user.click(screen.getByRole('radio', { name: 'Cards' }));

    expect(onValueChange).toHaveBeenCalledWith('cards');
    expect(screen.getByRole('radio', { name: 'List' })).toBeChecked();
  });

  it('clears an optional selection through the clear action', async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();

    render(
      <RadioGroup
        clearable
        defaultValue="documentation"
        label="Category filter"
        onValueChange={onValueChange}
      >
        <Radio label="Documentation" value="documentation" />
        <Radio label="Design" value="design" />
      </RadioGroup>,
    );

    await user.click(screen.getByRole('button', { name: 'Clear selection' }));

    expect(
      screen.getByRole('radio', { name: 'Documentation' }),
    ).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Design' })).not.toBeChecked();
    expect(onValueChange).toHaveBeenCalledWith(null);
    expect(
      screen.queryByRole('button', { name: 'Clear selection' }),
    ).not.toBeInTheDocument();
  });

  it('associates card descriptions with their radio inputs', () => {
    render(
      <RadioGroup label="Layout">
        <RadioCard
          description="Show each item in a compact row."
          label="List"
          value="list"
        />
      </RadioGroup>,
    );

    expect(
      screen.getByRole('radio', { name: 'List' }),
    ).toHaveAccessibleDescription('Show each item in a compact row.');
  });

  it('provides an accessible group name and description', () => {
    render(
      <RadioGroup
        description="Choose how example items are displayed."
        label="Layout"
      >
        <Radio label="List" value="list" />
      </RadioGroup>,
    );

    expect(screen.getByRole('group', { name: 'Layout' })).toHaveAccessibleDescription(
      'Choose how example items are displayed.',
    );
  });

  it('does not change selection when the group is disabled', async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();

    render(
      <RadioGroup
        defaultValue="list"
        disabled
        label="Layout"
        onValueChange={onValueChange}
      >
        <Radio label="List" value="list" />
        <Radio label="Cards" value="cards" />
      </RadioGroup>,
    );

    await user.click(screen.getByRole('radio', { name: 'Cards' }));

    expect(screen.getByRole('radio', { name: 'List' })).toBeChecked();
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
