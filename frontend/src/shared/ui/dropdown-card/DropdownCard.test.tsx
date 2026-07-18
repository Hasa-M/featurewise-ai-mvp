import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DropdownCard } from './DropdownCard';

describe('DropdownCard', () => {
  it('opens an accessible panel and restores trigger focus on Escape', async () => {
    const user = userEvent.setup();
    render(
      <DropdownCard label="Northstar Labs" panelLabel="Organization settings">
        <button type="button">Save changes</button>
      </DropdownCard>,
    );

    const trigger = screen.getByRole('button', { name: 'Northstar Labs' });
    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('dialog', { name: 'Organization settings' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save changes' })).toHaveFocus();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('supports controlled visibility and outside dismissal', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <div>
        <DropdownCard
          label="Northstar Labs"
          onOpenChange={onOpenChange}
          open
          panelLabel="Organization settings"
        >
          <button type="button">Save changes</button>
        </DropdownCard>
        <button type="button">Outside</button>
      </div>,
    );

    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not open while disabled', async () => {
    const user = userEvent.setup();
    render(
      <DropdownCard
        disabled
        label="Northstar Labs"
        panelLabel="Organization settings"
      >
        Settings
      </DropdownCard>,
    );

    await user.click(screen.getByRole('button', { name: 'Northstar Labs' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
