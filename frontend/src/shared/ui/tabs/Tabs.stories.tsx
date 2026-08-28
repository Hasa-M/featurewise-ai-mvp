import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  CircleCheck,
  FileClock,
  FileText,
  Images,
  Settings2,
} from 'lucide-react';
import { expect, waitFor } from 'storybook/test';

import { Tabs, type TabsItems } from './Tabs';

const items = [
  {
    icon: <FileText size={16} strokeWidth={1.75} />,
    id: 'overview',
    info: 'Ready',
    label: 'Overview',
  },
  {
    icon: <Images size={16} strokeWidth={1.75} />,
    id: 'context',
    info: 12,
    label: 'Context artifacts',
  },
  {
    icon: <Settings2 size={16} strokeWidth={1.75} />,
    id: 'settings',
    label: 'Analysis settings',
  },
  {
    icon: <CircleCheck size={16} strokeWidth={1.75} />,
    id: 'quality',
    info: 4,
    label: 'Quality checks',
  },
  {
    icon: <FileClock size={16} strokeWidth={1.75} />,
    id: 'history',
    label: 'Analysis history',
  },
] satisfies TabsItems;

const meta = {
  title: 'Shared/Tabs',
  component: Tabs,
  args: {
    'aria-label': 'Feature workspace',
    defaultValue: 'overview',
    items,
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: 'min(64rem, 100%)',
          minHeight: '14rem',
          padding: 'var(--space-8)',
        }}
      >
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutIcons: Story = {
  args: {
    items: [
      { id: 'specification', label: 'Feature specification' },
      { id: 'criteria', info: 8, label: 'Acceptance criteria' },
      { id: 'risks', info: 'Needs attention', label: 'Risks' },
    ],
  },
};

export const Disabled: Story = {
  args: {
    items: [
      items[0],
      { ...items[1], disabled: true },
      items[2],
    ],
  },
};

export const Overflow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 'min(32rem, 100%)' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas, userEvent }) => {
    const more = await canvas.findByRole('button', { name: 'More tabs' });
    await userEvent.click(more);

    const analysisSettings = await canvas.findByRole('menuitem', {
      name: 'Analysis settings',
    });
    const menuItems = canvas.getAllByRole('menuitem');
    await waitFor(() =>
      expect(
        menuItems.some(
          (menuItem) => menuItem === menuItem.ownerDocument.activeElement,
        ),
      ).toBe(true),
    );
    await userEvent.click(analysisSettings);

    const selectedTab = await canvas.findByRole('tab', {
      name: 'Analysis settings',
    });
    await expect(selectedTab).toHaveAttribute('aria-selected', 'true');
    await expect(selectedTab).toHaveFocus();
    await expect(
      canvas.queryByRole('tab', { name: 'Context artifacts' }),
    ).not.toBeInTheDocument();

    await userEvent.click(more);
    await expect(
      canvas.getByRole('menuitem', { name: 'Context artifacts' }),
    ).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect(more).toHaveFocus();
  },
};
