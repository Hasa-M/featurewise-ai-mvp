import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Toggle } from './Toggle';

describe('Toggle', () => {
  it('toggles through its visible label', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<Toggle label="Include context artifacts" onChange={onChange} />);
    const toggle = screen.getByRole('switch', {
      name: 'Include context artifacts',
    });

    await user.click(toggle);

    expect(toggle).toBeChecked();
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('supports an aria label when no visible label is shown', () => {
    render(<Toggle aria-label="Include context artifacts" />);

    expect(
      screen.getByRole('switch', { name: 'Include context artifacts' }),
    ).toBeInTheDocument();
  });

  it('associates its description with the switch', () => {
    render(
      <Toggle
        description="Add artifacts to the next spec run."
        label="Include context artifacts"
      />,
    );

    expect(
      screen.getByRole('switch', { name: 'Include context artifacts' }),
    ).toHaveAccessibleDescription('Add artifacts to the next spec run.');
  });

  it('supports regular and medium label weights', () => {
    const { rerender } = render(
      <Toggle label="Include context artifacts" labelWeight="regular" />,
    );

    expect(
      screen.getByText('Include context artifacts').closest('label'),
    ).toHaveAttribute('data-label-weight', 'regular');

    rerender(
      <Toggle label="Include context artifacts" labelWeight="medium" />,
    );

    expect(
      screen.getByText('Include context artifacts').closest('label'),
    ).toHaveAttribute('data-label-weight', 'medium');
  });

  it('does not change when disabled', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <Toggle disabled label="Include context artifacts" onChange={onChange} />,
    );
    const toggle = screen.getByRole('switch', {
      name: 'Include context artifacts',
    });

    await user.click(toggle);

    expect(toggle).not.toBeChecked();
    expect(onChange).not.toHaveBeenCalled();
  });
});
