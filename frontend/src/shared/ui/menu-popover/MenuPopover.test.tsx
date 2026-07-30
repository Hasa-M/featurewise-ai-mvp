import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { MenuItem } from '../menu';
import { MenuPopover } from './MenuPopover';

describe('MenuPopover', () => {
  it('opens with keyboard focus and restores focus on Escape', async () => {
    const user = userEvent.setup();
    render(
      <MenuPopover label='Open feature menu'>
        <MenuItem>Edit feature</MenuItem>
        <MenuItem variant='danger'>Delete feature</MenuItem>
      </MenuPopover>,
    );

    const trigger = screen.getByRole('button', { name: 'Open feature menu' });
    await user.click(trigger);
    expect(screen.getByRole('menuitem', { name: 'Edit feature' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Delete feature' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('closes after a menu action is selected', async () => {
    const user = userEvent.setup();
    render(
      <MenuPopover label='Open project menu'>
        <MenuItem>Edit project</MenuItem>
      </MenuPopover>,
    );

    await user.click(screen.getByRole('button', { name: 'Open project menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Edit project' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

