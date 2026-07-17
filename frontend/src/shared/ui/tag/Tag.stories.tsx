import type { Meta, StoryObj } from '@storybook/react-vite';

import { Tag } from './Tag';

const meta = {
  title: 'Shared/Tag',
  component: Tag,
  args: {
    children: 'Product brief',
  },
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Removable: Story = {
  args: {
    onRemove: () => undefined,
    removeLabel: 'Remove product brief',
  },
};

export const DisabledRemove: Story = {
  args: {
    disabled: true,
    onRemove: () => undefined,
  },
};
