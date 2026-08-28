import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileText, Settings, Trash2 } from 'lucide-react';

import { MenuItem } from './Menu';

const meta = {
  title: 'Shared/MenuItem',
  component: MenuItem,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '16rem' }}>
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof MenuItem>;

export default meta;
type Story = StoryObj<typeof MenuItem>;

export const Default: Story = {
  args: {
    children: 'Feature settings',
    leadingIcon: <Settings size={16} strokeWidth={1.75} />,
  },
};

export const Selected: Story = {
  args: {
    children: 'Features',
    leadingIcon: <FileText size={16} strokeWidth={1.75} />,
    selected: true,
  },
};

export const Linked: Story = {
  args: {
    children: 'Analysis 2',
    href: '#analysis-2',
    leadingIcon: <FileText size={16} strokeWidth={1.75} />,
    selected: true,
  },
};

export const Disabled: Story = {
  args: {
    children: 'Feature settings',
    disabled: true,
    leadingIcon: <Settings size={16} strokeWidth={1.75} />,
  },
};
export const Destructive: Story = {
  args: {
    children: 'Delete feature',
    leadingIcon: <Trash2 size={16} strokeWidth={1.75} />,
    variant: 'danger',
  },
};
