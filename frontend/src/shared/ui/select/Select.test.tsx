import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Select } from './Select';

const options = [
  { label: 'Ready', value: 'ready' },
  { label: 'Needs attention', value: 'attention' },
  { label: 'Blocked', value: 'blocked' },
];

describe('Select', () => {
  it('selects a single option and closes the menu', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Select label="Readiness" onChange={onChange} options={options} value="" />,
    );

    const control = screen.getByRole('combobox', { name: 'Readiness' });
    await user.click(control);
    await user.click(screen.getByRole('option', { name: 'Ready' }));

    expect(onChange).toHaveBeenCalledWith('ready');
    expect(control).toHaveAttribute('aria-expanded', 'false');
  });

  it('supports keyboard selection', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Select aria-label="Status" onChange={onChange} options={options} value="" />,
    );

    const control = screen.getByRole('combobox', { name: 'Status' });
    control.focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(onChange).toHaveBeenCalledWith('ready');
  });

  it('adds and removes values in multiple mode', async () => {
    const user = userEvent.setup();

    function Example() {
      const [value, setValue] = useState(['ready']);
      return (
        <Select
          label="Readiness filters"
          mode="multiple"
          onChange={setValue}
          options={options}
          value={value}
        />
      );
    }

    render(<Example />);
    await user.click(screen.getByRole('combobox', { name: 'Readiness filters' }));
    await user.click(screen.getByRole('option', { name: 'Blocked' }));

    expect(screen.getByRole('button', { name: 'Remove Blocked' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Remove Ready' }));
    expect(screen.queryByRole('button', { name: 'Remove Ready' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows search only when there are more than 12 options and filters them', async () => {
    const user = userEvent.setup();
    const manyOptions = Array.from({ length: 13 }, (_, index) => ({
      label: `Context artifact ${index + 1}`,
      value: `context-${index + 1}`,
    }));
    render(
      <Select
        label="Context artifact"
        onChange={() => undefined}
        options={manyOptions}
      />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Context artifact' }));
    const search = screen.getByRole('searchbox', { name: 'Search Context artifact' });
    await user.type(search, '13');

    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option', { name: 'Context artifact 13' })).toBeVisible();
  });

  it('omits search for exactly 12 options', async () => {
    const user = userEvent.setup();
    const twelveOptions = Array.from({ length: 12 }, (_, index) => ({
      label: `Option ${index + 1}`,
      value: `${index + 1}`,
    }));
    render(
      <Select aria-label="Option" onChange={() => undefined} options={twelveOptions} />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Option' }));
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('renders an empty search state', async () => {
    const user = userEvent.setup();
    const manyOptions = Array.from({ length: 13 }, (_, index) => ({
      label: `Feature ${index + 1}`,
      value: `${index + 1}`,
    }));
    render(
      <Select aria-label="Feature" onChange={() => undefined} options={manyOptions} />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Feature' }));
    await user.type(screen.getByRole('searchbox'), 'missing');
    expect(screen.getByRole('status')).toHaveTextContent('No options found');
  });

  it('exposes helper, error, and required states accessibly', () => {
    render(
      <Select
        errorMessage="Select a readiness state."
        helperText="Choose the current review outcome."
        label="Readiness"
        onChange={() => undefined}
        options={options}
        required
      />,
    );

    const control = screen.getByRole('combobox', { name: 'Readiness' });
    expect(control).toHaveAttribute('aria-required', 'true');
    expect(control).toHaveAttribute('aria-invalid', 'true');
    expect(control).toHaveAccessibleDescription(
      'Choose the current review outcome. Select a readiness state.',
    );
  });

  it('does not open when disabled', async () => {
    const user = userEvent.setup();
    render(
      <Select
        aria-label="Readiness"
        disabled
        onChange={() => undefined}
        options={options}
      />,
    );

    const control = screen.getByRole('combobox', { name: 'Readiness' });
    await user.click(control);
    expect(control).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
