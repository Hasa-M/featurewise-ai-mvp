import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('checks through its visible label', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<Checkbox label="Mark checklist item complete" onChange={onChange} />);
    const checkbox = screen.getByRole('checkbox', {
      name: 'Mark checklist item complete',
    });

    await user.click(checkbox);

    expect(checkbox).toBeChecked();
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('supports an aria label when no visible label is shown', () => {
    render(<Checkbox aria-label="Mark checklist item complete" />);

    expect(
      screen.getByRole('checkbox', { name: 'Mark checklist item complete' }),
    ).toBeInTheDocument();
  });

  it('associates its description with the checkbox', () => {
    render(
      <Checkbox
        description="Confirm the acceptance criteria are testable."
        label="Mark checklist item complete"
      />,
    );

    expect(
      screen.getByRole('checkbox', { name: 'Mark checklist item complete' }),
    ).toHaveAccessibleDescription(
      'Confirm the acceptance criteria are testable.',
    );
  });

  it('exposes a native indeterminate state', () => {
    render(<Checkbox indeterminate label="Select all context artifacts" />);

    expect(
      screen.getByRole('checkbox', { name: 'Select all context artifacts' }),
    ).toBePartiallyChecked();
  });

  it('updates its indeterminate state', () => {
    const { rerender } = render(
      <Checkbox indeterminate label="Select all context artifacts" />,
    );
    const checkbox = screen.getByRole('checkbox', {
      name: 'Select all context artifacts',
    });

    rerender(
      <Checkbox indeterminate={false} label="Select all context artifacts" />,
    );

    expect(checkbox).not.toBePartiallyChecked();
  });

  it('supports regular and medium label weights', () => {
    const { rerender } = render(
      <Checkbox
        label="Mark checklist item complete"
        labelWeight="regular"
      />,
    );

    expect(
      screen.getByText('Mark checklist item complete').closest('label'),
    ).toHaveAttribute('data-label-weight', 'regular');

    rerender(
      <Checkbox
        label="Mark checklist item complete"
        labelWeight="medium"
      />,
    );

    expect(
      screen.getByText('Mark checklist item complete').closest('label'),
    ).toHaveAttribute('data-label-weight', 'medium');
  });

  it('does not change when disabled', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <Checkbox disabled label="Mark checklist item complete" onChange={onChange} />,
    );
    const checkbox = screen.getByRole('checkbox', {
      name: 'Mark checklist item complete',
    });

    await user.click(checkbox);

    expect(checkbox).not.toBeChecked();
    expect(onChange).not.toHaveBeenCalled();
  });
});
