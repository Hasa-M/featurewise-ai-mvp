import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowRight, Plus } from 'lucide-react';

import { Button } from './Button';

const meta = {
  title: 'Shared/Button',
  component: Button,
  args: {
    children: 'Create feature',
  },
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: { variant: 'secondary' },
};

export const Ghost: Story = {
  args: { variant: 'ghost' },
};

export const Danger: Story = {
  args: { children: 'Delete feature', variant: 'danger' },
};

export const WithLeadingIcon: Story = {
  args: {
    children: 'Create feature',
    leadingIcon: <Plus size={16} />,
  },
};

export const WithTrailingIcon: Story = {
  args: {
    children: 'Continue',
    trailingIcon: <ArrowRight size={16} />,
  },
};

export const IconOnly: Story = {
  args: {
    'aria-label': 'Create feature',
    children: <Plus size={18} aria-hidden="true" />,
    isIcon: true,
    title: 'Create feature',
  },
};

export const Loading: Story = {
  args: { loading: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Large: Story = {
  args: { size: 'large' },
};
