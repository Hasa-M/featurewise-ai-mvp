import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { MenuItem } from '../menu';
import { MenuPopover } from './MenuPopover';

const meta = {
  title: 'Shared/MenuPopover',
  component: MenuPopover,
  args: {
    children: (
      <>
        <MenuItem>Edit feature</MenuItem>
        <MenuItem variant='danger'>Delete feature</MenuItem>
      </>
    ),
    label: 'Open feature menu',
  },
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof MenuPopover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Open feature menu' }));
    await expect(canvas.getByRole('menuitem', { name: 'Edit feature' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect(canvas.queryByRole('menu')).not.toBeInTheDocument();
  },
};

