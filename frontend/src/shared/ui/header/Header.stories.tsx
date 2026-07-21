import type { Meta, StoryObj } from '@storybook/react-vite';
import { Building2, UserRound } from 'lucide-react';

import { Button } from '../button';
import { Header } from './Header';

const meta = {
  title: 'Global/Header',
  component: Header,
  args: {
    dropdownCardProps: {
      children: (
        <div style={{ padding: 'var(--space-4)' }}>
          Organization settings
        </div>
      ),
      label: 'Northstar Labs',
      leadingVisual: <Building2 size={16} strokeWidth={1.75} />,
      panelLabel: 'Organization settings',
    },
    homeHref: '#home',
    userControl: (
      <Button aria-label="Open user menu" isIcon size="small" variant="ghost">
        <UserRound aria-hidden="true" size={17} strokeWidth={1.75} />
      </Button>
    ),
  },
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Compact: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '24rem' }}>
        <Story />
      </div>
    ),
  ],
};
