import type { Meta, StoryObj } from '@storybook/react-vite';

import { type BreadcrumbItems } from '../breadcrumb';
import { Header } from './Header';

const breadcrumbItems = [
  { href: '#organization', label: 'Northstar Labs' },
  { href: '#project', label: 'Featurewise MVP' },
  { href: '#feature', label: 'Spec generation' },
  { label: 'Context' },
] satisfies BreadcrumbItems;

const meta = {
  title: 'Layout/Header',
  component: Header,
  args: {
    breadcrumbItems,
    homeHref: '#home',
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
