import type { Meta, StoryObj } from '@storybook/react-vite';

import { NativeNavigationLink } from './NavigationLink';

const meta = {
  title: 'Shared/NavigationLink',
  component: NativeNavigationLink,
  args: {
    children: 'Open projects',
    href: '#projects',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof NativeNavigationLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
