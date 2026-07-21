import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileText, List, MoreVertical, Plus } from 'lucide-react';
import { expect, waitFor } from 'storybook/test';

import { MenuItem } from '../menu';
import { Accordion } from './Accordion';

const recentFeatures = [
  'Backend CRUD API map',
  'DB base population',
  'The idea',
  'Update feature context',
  'Get feature context',
];

const meta = {
  title: 'Shared/Accordion',
  component: Accordion,
  args: {
    children: <p>Add any sidebar content here.</p>,
    label: 'Recents',
  },
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(16rem, calc(100vw - 2rem))' }}>
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: 'Recents' });

    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByRole('region', { name: 'Recents' })).toBeVisible();
  },
};

export const ExpandedWithMenuItems: Story = {
  args: {
    children: recentFeatures.map((feature) => (
      <MenuItem key={feature} leadingIcon={<FileText />}>
        {feature}
      </MenuItem>
    )),
    defaultOpen: true,
  },
};

export const WithActions: Story = {
  args: {
    actions: [
      {
        'aria-label': 'Open recent feature menu',
        icon: <MoreVertical />,
        onClick: () => undefined,
        visibility: 'hover',
      },
      {
        'aria-label': 'View all recent features',
        icon: <List />,
        onClick: () => undefined,
      },
      {
        'aria-label': 'Add recent feature',
        icon: <Plus />,
        onClick: () => undefined,
      },
    ],
    leadingIcon: <FileText />,
  },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Recents' });
    const menu = canvas.getByRole('button', {
      name: 'Open recent feature menu',
    });

    await expect(menu).not.toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'View all recent features' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Add recent feature' }),
    ).toBeVisible();

    trigger.focus();
    await waitFor(() => expect(menu).toBeVisible());
  },
};

export const SelectedWithLinkActions: Story = {
  args: {
    actions: [
      {
        'aria-label': 'View all recent features',
        href: '#all-recents',
        icon: <List />,
      },
      {
        'aria-label': 'Add recent feature',
        href: '#new-recent',
        icon: <Plus />,
      },
    ],
    leadingIcon: <FileText />,
    selection: 'current',
  },
};

export const AncestorSelection: Story = {
  args: {
    defaultOpen: true,
    leadingIcon: <FileText />,
    selection: 'ancestor',
  },
};

export const Disabled: Story = {
  args: {
    actions: [
      {
        'aria-label': 'Open recent feature menu',
        icon: <MoreVertical />,
        onClick: () => undefined,
        visibility: 'hover',
      },
      {
        'aria-label': 'View all recent features',
        icon: <List />,
        onClick: () => undefined,
      },
      {
        'aria-label': 'Add recent feature',
        icon: <Plus />,
        onClick: () => undefined,
      },
    ],
    disabled: true,
  },
};
