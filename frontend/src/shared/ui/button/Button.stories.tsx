import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArrowRight, Plus } from 'lucide-react';

import { Button } from './Button';

const leadingIconOptions = {
  none: undefined,
  plus: <Plus size={16} strokeWidth={1.75} />,
} as const;

const trailingIconOptions = {
  none: undefined,
  arrowRight: <ArrowRight size={16} strokeWidth={1.75} />,
} as const;

const meta = {
  title: 'Shared/Button',
  component: Button,
  args: {
    children: 'Create feature',
  },
  argTypes: {
    'aria-label': {
      control: 'text',
      description: 'Required for icon-only buttons.',
    },
    children: {
      control: 'text',
      description: 'Visible button label. Use the Icon only story for icon children.',
    },
    disabled: { control: 'boolean' },
    isIcon: {
      control: 'boolean',
      description: 'Use with an icon child and aria-label.',
    },
    leadingIcon: {
      control: 'select',
      description: 'Decorative icon before the label.',
      mapping: leadingIconOptions,
      options: Object.keys(leadingIconOptions),
    },
    loading: { control: 'boolean' },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
    title: {
      control: 'text',
      description: 'Tooltip text for icon-only buttons.',
    },
    trailingIcon: {
      control: 'select',
      description: 'Decorative icon after the label.',
      mapping: trailingIconOptions,
      options: Object.keys(trailingIconOptions),
    },
    type: {
      control: 'select',
      options: ['button', 'submit', 'reset'],
    },
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
  },
  parameters: {
    controls: {
      include: [
        'children',
        'variant',
        'size',
        'leadingIcon',
        'trailingIcon',
        'isIcon',
        'aria-label',
        'title',
        'loading',
        'disabled',
        'type',
      ],
    },
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
    leadingIcon: <Plus size={16} strokeWidth={1.75} />,
  },
};

export const WithTrailingIcon: Story = {
  args: {
    children: 'Continue',
    trailingIcon: <ArrowRight size={16} strokeWidth={1.75} />,
  },
};

export const IconOnly: Story = {
  args: {
    'aria-label': 'Create feature',
    children: <Plus size={18} strokeWidth={1.75} aria-hidden="true" />,
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

export const Small: Story = {
  args: { size: 'small' },
};

export const Large: Story = {
  args: { size: 'large' },
};
