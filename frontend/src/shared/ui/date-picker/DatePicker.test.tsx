import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DatePicker } from './DatePicker';
import type { DateRangeValue } from './DatePicker';

describe('DatePicker', () => {
  it('returns a backend-ready ISO date in single mode', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DatePicker
        defaultMonth="2026-07-01"
        label="Target date"
        locale="en-US"
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Target date' }));
    await user.click(screen.getByRole('button', { name: 'Friday, July 17, 2026' }));

    expect(onChange).toHaveBeenCalledWith('2026-07-17');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('selects an ordered range and disables dates before its start', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    function Example() {
      const [value, setValue] = useState<DateRangeValue>({ end: '', start: '' });
      return (
        <DatePicker
          defaultMonth="2026-07-01"
          label="Review window"
          locale="en-US"
          mode="range"
          onChange={(nextValue) => {
            onChange(nextValue);
            setValue(nextValue);
          }}
          value={value}
        />
      );
    }

    render(<Example />);
    await user.click(screen.getByRole('button', { name: 'Review window' }));
    await user.click(screen.getByRole('button', { name: 'Friday, July 10, 2026' }));

    expect(screen.getByRole('button', { name: 'Thursday, July 9, 2026' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Wednesday, July 15, 2026' }));

    expect(onChange).toHaveBeenLastCalledWith({ start: '2026-07-10', end: '2026-07-15' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('uses fast month and year navigation while choosing a range end', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    function Example() {
      const [value, setValue] = useState<DateRangeValue>({ end: '', start: '' });
      return (
        <DatePicker
          defaultMonth="2026-07-01"
          label="Review window"
          locale="en-US"
          mode="range"
          onChange={(nextValue) => {
            onChange(nextValue);
            setValue(nextValue);
          }}
          value={value}
        />
      );
    }

    render(<Example />);
    await user.click(screen.getByRole('button', { name: 'Review window' }));
    await user.click(screen.getByRole('button', { name: 'Friday, July 10, 2026' }));
    await user.click(screen.getByRole('button', { name: 'July 2026' }));
    const year = screen.getByRole('textbox', { name: 'Year' });
    await user.clear(year);
    await user.type(year, '2036');
    await user.click(screen.getByRole('button', { name: 'Mar 2036' }));
    await user.click(screen.getByRole('button', { name: 'Saturday, March 1, 2036' }));

    expect(onChange).toHaveBeenLastCalledWith({ start: '2026-07-10', end: '2036-03-01' });
  });

  it('does not allow a range to cross a custom-disabled date', async () => {
    const user = userEvent.setup();

    function Example() {
      const [value, setValue] = useState<DateRangeValue>({ end: '', start: '' });
      return (
        <DatePicker
          defaultMonth="2026-07-01"
          isDateDisabled={(_date, isoDate) => isoDate === '2026-07-13'}
          label="Review window"
          locale="en-US"
          mode="range"
          onChange={setValue}
          value={value}
        />
      );
    }

    render(<Example />);
    await user.click(screen.getByRole('button', { name: 'Review window' }));
    await user.click(screen.getByRole('button', { name: 'Friday, July 10, 2026' }));

    expect(screen.getByRole('button', { name: 'Monday, July 13, 2026' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Wednesday, July 15, 2026' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sunday, July 12, 2026' })).toBeEnabled();
  });

  it('supports predicate rules based on the day number', async () => {
    const user = userEvent.setup();
    render(
      <DatePicker
        defaultMonth="2026-07-01"
        isDateDisabled={(date) => date.getDate() % 2 === 1}
        label="Checkpoint date"
        locale="en-US"
        onChange={() => undefined}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Checkpoint date' }));
    expect(screen.getByRole('button', { name: 'Friday, July 17, 2026' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Saturday, July 18, 2026' })).toBeEnabled();
  });

  it('jumps directly to a typed year and selected month', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DatePicker
        defaultMonth="2026-07-01"
        label="Target date"
        locale="en-US"
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Target date' }));
    await user.click(screen.getByRole('button', { name: 'July 2026' }));
    const year = screen.getByRole('textbox', { name: 'Year' });
    await user.clear(year);
    await user.type(year, '2036');
    await user.click(screen.getByRole('button', { name: 'Mar 2036' }));
    await user.click(screen.getByRole('button', { name: 'Saturday, March 1, 2036' }));

    expect(onChange).toHaveBeenCalledWith('2036-03-01');
  });

  it('disables months outside the configured date boundaries', async () => {
    const user = userEvent.setup();
    render(
      <DatePicker
        defaultMonth="2026-07-01"
        label="Target date"
        locale="en-US"
        maxDate="2027-02-20"
        minDate="2026-05-10"
        onChange={() => undefined}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Target date' }));
    await user.click(screen.getByRole('button', { name: 'July 2026' }));
    expect(screen.getByRole('button', { name: 'Apr 2026' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'May 2026' })).toBeEnabled();

    const year = screen.getByRole('textbox', { name: 'Year' });
    await user.clear(year);
    await user.type(year, '2027');
    expect(screen.getByRole('button', { name: 'Feb 2027' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Mar 2027' })).toBeDisabled();
  });

  it('exposes helper, error, and required states accessibly', () => {
    render(
      <DatePicker
        errorMessage="Select a target date."
        helperText="Use the expected completion date."
        label="Target date"
        onChange={() => undefined}
        required
      />,
    );

    const control = screen.getByRole('button', { name: 'Target date' });
    expect(control).toHaveAttribute('aria-required', 'true');
    expect(control).toHaveAttribute('aria-invalid', 'true');
    expect(control).toHaveAccessibleDescription(
      'Use the expected completion date. Select a target date.',
    );
  });

  it('does not open when disabled', async () => {
    const user = userEvent.setup();
    render(
      <DatePicker disabled label="Target date" onChange={() => undefined} />,
    );

    const control = screen.getByRole('button', { name: 'Target date' });
    expect(control).toBeDisabled();
    await user.click(control);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders ISO values in hidden form inputs', () => {
    const { container } = render(
      <DatePicker
        label="Review window"
        mode="range"
        name={{ end: 'reviewEnd', start: 'reviewStart' }}
        onChange={() => undefined}
        value={{ end: '2026-07-15', start: '2026-07-10' }}
      />,
    );

    expect(container.querySelector('input[name="reviewStart"]')).toHaveValue('2026-07-10');
    expect(container.querySelector('input[name="reviewEnd"]')).toHaveValue('2026-07-15');
  });
});
