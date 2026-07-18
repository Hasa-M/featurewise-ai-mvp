import type { Meta, StoryObj } from '@storybook/react-vite';

import { Logo } from './Logo';

const meta = {
  title: 'Shared/Logo',
  component: Logo,
  args: {
    alt: 'Featurewise',
    size: 'medium',
    tone: 'default',
    variant: 'wordmark',
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'] },
    tone: { control: 'inline-radio', options: ['default', 'inverse'] },
    variant: { control: 'inline-radio', options: ['wordmark', 'icon'] },
  },
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Icon: Story = {
  args: { variant: 'icon' },
};

export const Inverse: Story = {
  args: { tone: 'inverse' },
  decorators: [
    (Story) => (
      <div
        style={{
          background: 'var(--surface-inverse)',
          borderRadius: 'var(--radius-card)',
          padding: 'var(--space-6)',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export const Small: Story = {
  args: { size: 'small' },
};

export const Large: Story = {
  args: { size: 'large' },
};
