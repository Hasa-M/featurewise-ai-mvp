import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChevronRight, Copy, FileText, Pencil, Trash2 } from 'lucide-react';
import { expect } from 'storybook/test';

import { MenuDivider, MenuItem, MenuSection, MenuWrapper } from './Menu';

const meta = {
  title: 'Shared/Menu',
  component: MenuWrapper,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof MenuWrapper>;

export default meta;
type Story = StoryObj<typeof MenuWrapper>;

export const Default: Story = {
  args: {
    'aria-label': 'Feature actions',
    children: (
      <>
        <MenuSection title="Feature">
          <MenuItem leadingIcon={<Pencil size={16} strokeWidth={1.75} />} selected>
            Edit feature
          </MenuItem>
          <MenuItem
            leadingIcon={<Copy size={16} strokeWidth={1.75} />}
            trailingIcon={<ChevronRight size={16} strokeWidth={1.75} />}
          >
            Duplicate to project
          </MenuItem>
        </MenuSection>
        <MenuDivider />
        <MenuSection title="Workspace">
          <MenuItem leadingIcon={<FileText size={16} strokeWidth={1.75} />}>
            Open specification
          </MenuItem>
          <MenuItem>Open context</MenuItem>
        </MenuSection>
        <MenuDivider />
        <MenuSection>
          <MenuItem
            leadingIcon={<Trash2 size={16} strokeWidth={1.75} />}
            variant="danger"
          >
            Delete feature
          </MenuItem>
        </MenuSection>
      </>
    ),
  },
  play: async ({ canvas, userEvent }) => {
    const firstItem = canvas.getByRole('menuitem', { name: 'Edit feature' });
    firstItem.focus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');

    await expect(
      canvas.getByRole('menuitem', { name: 'Open specification' }),
    ).toHaveFocus();
  },
};

export const WithoutIcons: Story = {
  args: {
    'aria-label': 'Workspace navigation',
    children: (
      <MenuSection title="Workspace">
        <MenuItem>Specification</MenuItem>
        <MenuItem>Context</MenuItem>
        <MenuItem>Project context</MenuItem>
      </MenuSection>
    ),
  },
};

export const DisabledItems: Story = {
  args: {
    'aria-label': 'Workspace actions',
    children: (
      <MenuSection title="Workspace">
        <MenuItem>Open specification</MenuItem>
        <MenuItem disabled>Analyses unavailable</MenuItem>
      </MenuSection>
    ),
  },
};

export const Destructive: Story = {
  args: {
    'aria-label': 'Dangerous actions',
    children: (
      <MenuSection>
        <MenuItem
          leadingIcon={<Trash2 size={16} strokeWidth={1.75} />}
          variant="danger"
        >
          Delete feature
        </MenuItem>
      </MenuSection>
    ),
  },
};
