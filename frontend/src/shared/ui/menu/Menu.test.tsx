import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChevronRight, Pencil } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { MenuDivider, MenuItem, MenuSection, MenuWrapper } from './Menu';

function ExampleMenu({ onEscape = () => undefined }) {
  return (
    <MenuWrapper aria-label="Feature actions" onEscape={onEscape}>
      <MenuSection title="Feature">
        <MenuItem leadingIcon={<Pencil />} onClick={() => undefined}>
          Edit feature
        </MenuItem>
        <MenuItem disabled>Duplicate feature</MenuItem>
      </MenuSection>
      <MenuDivider />
      <MenuSection title="Spec">
        <MenuItem trailingIcon={<ChevronRight />}>Export spec</MenuItem>
        <MenuItem variant="danger">Delete feature</MenuItem>
      </MenuSection>
    </MenuWrapper>
  );
}

describe('Menu', () => {
  it('exposes a named menu with labelled sections and separators', () => {
    render(<ExampleMenu />);

    expect(screen.getByRole('menu', { name: 'Feature actions' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'Feature' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'Spec' })).toBeVisible();
    expect(screen.getByRole('separator')).toBeVisible();
    expect(screen.getAllByRole('menuitem')).toHaveLength(4);
  });

  it('invokes an enabled item and prevents disabled item interaction', async () => {
    const enabledClick = vi.fn();
    const disabledClick = vi.fn();
    const user = userEvent.setup();
    render(
      <MenuWrapper aria-label="Actions">
        <MenuSection>
          <MenuItem onClick={enabledClick}>Edit feature</MenuItem>
          <MenuItem disabled onClick={disabledClick}>
            Duplicate feature
          </MenuItem>
        </MenuSection>
      </MenuWrapper>,
    );

    await user.click(screen.getByRole('menuitem', { name: 'Edit feature' }));
    await user.click(screen.getByRole('menuitem', { name: 'Duplicate feature' }));

    expect(enabledClick).toHaveBeenCalledOnce();
    expect(disabledClick).not.toHaveBeenCalled();
  });

  it('moves focus with arrow, Home, End, and typeahead keys', async () => {
    const user = userEvent.setup();
    render(<ExampleMenu />);
    const edit = screen.getByRole('menuitem', { name: 'Edit feature' });
    const exportSpec = screen.getByRole('menuitem', { name: 'Export spec' });
    const deleteFeature = screen.getByRole('menuitem', { name: 'Delete feature' });

    edit.focus();
    await user.keyboard('{ArrowDown}');
    expect(exportSpec).toHaveFocus();
    await user.keyboard('{End}');
    expect(deleteFeature).toHaveFocus();
    await user.keyboard('{Home}');
    expect(edit).toHaveFocus();
    await user.keyboard('d');
    expect(deleteFeature).toHaveFocus();
  });

  it('reports Escape without owning dropdown visibility', async () => {
    const onEscape = vi.fn();
    const user = userEvent.setup();
    render(<ExampleMenu onEscape={onEscape} />);

    screen.getByRole('menuitem', { name: 'Edit feature' }).focus();
    await user.keyboard('{Escape}');

    expect(onEscape).toHaveBeenCalledOnce();
  });

  it('keeps decorative icons out of the accessible item name', () => {
    render(<ExampleMenu />);

    expect(
      screen.getByRole('menuitem', { name: 'Edit feature' }),
    ).toHaveAccessibleName('Edit feature');
    expect(
      screen.getByRole('menuitem', { name: 'Export spec' }),
    ).toHaveAccessibleName('Export spec');
  });
  it('behaves as a normal button outside a MenuWrapper', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<MenuItem onClick={onClick}>Features</MenuItem>);

    const item = screen.getByRole('button', { name: 'Features' });
    expect(item).toHaveProperty('tabIndex', 0);
    await user.click(item);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('communicates the selected state accessibly', () => {
    render(<MenuItem selected>Features</MenuItem>);

    expect(screen.getByRole('button', { name: 'Features' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
