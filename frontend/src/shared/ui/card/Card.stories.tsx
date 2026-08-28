import type { Meta, StoryObj } from '@storybook/react-vite';

import { Card } from './Card';

const cardContent = (
  <div
    style={{
      display: 'grid',
      gap: 'var(--space-2)',
    }}
  >
    <strong style={{ color: 'var(--text-strong)' }}>Checkout readiness</strong>
    <span>
      The feature specification and acceptance criteria are ready for review.
    </span>
  </div>
);

const meta = {
  title: 'Shared/Card',
  component: Card,
  args: {
    children: cardContent,
  },
  argTypes: {
    height: { control: 'text' },
    onClick: { control: false },
    width: { control: 'text' },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          minHeight: '14rem',
          padding: 'var(--space-8)',
          background: 'var(--surface-canvas)',
        }}
      >
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FillWidth: Story = {
  args: {
    width: '100%',
  },
};

export const FitContent: Story = {
  args: {
    children: <span>Draft spec</span>,
    width: 'fit-content',
  },
};

export const FixedSize: Story = {
  args: {
    height: 180,
    width: 320,
  },
};

export const Interactive: Story = {
  args: {
    'aria-label': 'Open checkout readiness',
    onClick: () => undefined,
    width: 320,
  },
};

export const Disabled: Story = {
  args: {
    'aria-label': 'Open checkout readiness',
    disabled: true,
    onClick: () => undefined,
    width: 320,
  },
};
