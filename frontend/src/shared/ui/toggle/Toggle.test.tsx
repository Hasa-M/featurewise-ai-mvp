import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Toggle } from './Toggle';

describe('Toggle', () => {
  it('toggles through its visible label', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<Toggle label="Show archived files" onChange={onChange} />);
    const toggle = screen.getByRole('switch', {
      name: 'Show archived files',
    });

    await user.click(toggle);

    expect(toggle).toBeChecked();
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('supports an aria label when no visible label is shown', () => {
    render(<Toggle aria-label="Show archived files" />);

    expect(
      screen.getByRole('switch', { name: 'Show archived files' }),
    ).toBeInTheDocument();
  });

  it('associates its description with the switch', () => {
    render(
      <Toggle
        description="Include archived context files in this list."
        label="Show archived files"
      />,
    );

    expect(
      screen.getByRole('switch', { name: 'Show archived files' }),
    ).toHaveAccessibleDescription('Include archived context files in this list.');
  });

  it('supports regular and medium label weights', () => {
    const { rerender } = render(
      <Toggle label="Show archived files" labelWeight="regular" />,
    );

    expect(
      screen.getByText('Show archived files').closest('label'),
    ).toHaveAttribute('data-label-weight', 'regular');

    rerender(
      <Toggle label="Show archived files" labelWeight="medium" />,
    );

    expect(
      screen.getByText('Show archived files').closest('label'),
    ).toHaveAttribute('data-label-weight', 'medium');
  });

  it('does not change when disabled', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <Toggle disabled label="Show archived files" onChange={onChange} />,
    );
    const toggle = screen.getByRole('switch', {
      name: 'Show archived files',
    });

    await user.click(toggle);

    expect(toggle).not.toBeChecked();
    expect(onChange).not.toHaveBeenCalled();
  });
});
