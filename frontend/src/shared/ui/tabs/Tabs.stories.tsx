import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileSearch, FileText, Images } from 'lucide-react';
import { expect, waitFor } from 'storybook/test';

import { Tabs, type TabsItems } from './Tabs';

const workspaceItems = [
  {
    icon: <FileText size={16} strokeWidth={1.75} />,
    id: 'specification',
    label: 'Specification',
  },
  {
    icon: <Images size={16} strokeWidth={1.75} />,
    id: 'context',
    label: 'Context',
  },
  {
    disabled: true,
    icon: <FileSearch size={16} strokeWidth={1.75} />,
    id: 'analyses',
    label: 'Analyses',
  },
] satisfies TabsItems;

const overflowItems = [
  { id: 'overview', label: 'Overview' },
  { id: 'details', label: 'Details' },
  { id: 'notes', label: 'Notes' },
  { id: 'activity', label: 'Activity' },
  { id: 'settings', label: 'Settings' },
] satisfies TabsItems;

const meta = {
  title: 'Shared/Tabs',
  component: Tabs,
  args: {
    'aria-label': 'Feature workspace',
    defaultValue: 'specification',
    items: workspaceItems,
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
      { id: 'specification', label: 'Specification' },
      { id: 'context', label: 'Context' },
      { disabled: true, id: 'analyses', label: 'Analyses' },
    ],
  },
};

export const Disabled: Story = {
  args: {
    items: [
      workspaceItems[0],
      workspaceItems[1],
      workspaceItems[2],
    ],
  },
};

export const Overflow: Story = {
  args: {
    'aria-label': 'Example sections',
    defaultValue: 'overview',
    items: overflowItems,
  },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(18rem, 100%)' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas, userEvent }) => {
    const more = await canvas.findByRole('button', { name: 'More tabs' });
    await userEvent.click(more);

    const notes = await canvas.findByRole('menuitem', {
      name: 'Notes',
    });
    const menuItems = canvas.getAllByRole('menuitem');
    await waitFor(() =>
      expect(
        menuItems.some(
          (menuItem) => menuItem === menuItem.ownerDocument.activeElement,
        ),
      ).toBe(true),
    );
    await userEvent.click(notes);

    const selectedTab = await canvas.findByRole('tab', {
      name: 'Notes',
    });
    await expect(selectedTab).toHaveAttribute('aria-selected', 'true');
    await expect(selectedTab).toHaveFocus();
    await expect(
      canvas.queryByRole('tab', { name: 'Details' }),
    ).not.toBeInTheDocument();

    await userEvent.click(more);
    await expect(
      canvas.getByRole('menuitem', { name: 'Details' }),
    ).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect(more).toHaveFocus();
  },
};
