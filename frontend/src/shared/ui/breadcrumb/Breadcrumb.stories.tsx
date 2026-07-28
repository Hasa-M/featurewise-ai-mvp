import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileText, FolderClosed, FolderKanban } from 'lucide-react';
import { expect } from 'storybook/test';

import { Breadcrumb, type BreadcrumbItems } from './Breadcrumb';

const featureItems = [
  {
    href: '#projects',
    icon: <FolderClosed size={14} strokeWidth={1.75} />,
    kind: 'folder',
    label: 'Projects',
  },
  {
    href: '#northstar-mobile',
    icon: <FolderKanban size={14} strokeWidth={1.75} />,
    kind: 'item',
    label: 'Northstar mobile',
  },
  {
    href: '#features',
    icon: <FolderClosed size={14} strokeWidth={1.75} />,
    kind: 'folder',
    label: 'Features',
  },
  {
    href: '#authentication',
    icon: <FileText size={14} strokeWidth={1.75} />,
    kind: 'item',
    label: 'Authentication workflow',
  },
] satisfies BreadcrumbItems;

const overflowItems = [
  {
    href: '#projects',
    icon: <FolderClosed size={14} strokeWidth={1.75} />,
    kind: 'folder',
    label: 'Projects',
  },
  {
    href: '#northstar-mobile',
    icon: <FolderKanban size={14} strokeWidth={1.75} />,
    kind: 'item',
    label: 'Northstar mobile',
  },
  {
    href: '#features',
    icon: <FolderClosed size={14} strokeWidth={1.75} />,
    kind: 'folder',
    label: 'Features',
  },
  {
    href: '#authentication',
    icon: <FileText size={14} strokeWidth={1.75} />,
    kind: 'item',
    label: 'Authentication workflow',
  },
  {
    href: '#generations',
    icon: <FolderClosed size={14} strokeWidth={1.75} />,
    kind: 'folder',
    label: 'Generations',
  },
  {
    href: '#generation-2',
    icon: <FileText size={14} strokeWidth={1.75} />,
    kind: 'item',
    label: 'Generation 2',
  },
] satisfies BreadcrumbItems;

const meta = {
  title: 'Global/Breadcrumb',
  component: Breadcrumb,
  args: {
    items: featureItems,
  },
  decorators: [
    (Story) => (
      <div
        style={{
          background: 'var(--surface-canvas)',
          minHeight: '10rem',
          padding: 'var(--space-8)',
          width: 'min(64rem, 100vw)',
        }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FeaturePage: Story = {};

export const ProjectsPage: Story = {
  args: {
    items: [
      {
        href: '#projects',
        icon: <FolderClosed size={14} strokeWidth={1.75} />,
        kind: 'folder',
        label: 'Projects',
      },
    ],
    titleId: 'projects-title',
  },
};

export const ProjectPage: Story = {
  args: {
    items: [
      {
        href: '#projects',
        icon: <FolderClosed size={14} strokeWidth={1.75} />,
        kind: 'folder',
        label: 'Projects',
      },
      {
        href: '#northstar-mobile',
        icon: <FolderKanban size={14} strokeWidth={1.75} />,
        kind: 'item',
        label: 'Northstar mobile',
      },
    ],
  },
};

export const LongHierarchy: Story = {
  args: {
    items: [
      {
        href: '#projects',
        icon: <FolderClosed size={14} strokeWidth={1.75} />,
        kind: 'folder',
        label: 'Projects',
      },
      {
        href: '#project',
        icon: <FolderKanban size={14} strokeWidth={1.75} />,
        kind: 'item',
        label: 'Customer onboarding modernization',
      },
      {
        href: '#features',
        icon: <FolderClosed size={14} strokeWidth={1.75} />,
        kind: 'folder',
        label: 'Features',
      },
      {
        href: '#specification',
        icon: <FileText size={14} strokeWidth={1.75} />,
        kind: 'item',
        label:
          'Implementation-readiness specification for authentication recovery',
      },
    ],
  },
};

export const Overflow: Story = {
  args: { items: overflowItems },
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('button', {
      name: 'Show hidden breadcrumb levels',
    });

    await expect(
      canvas.queryByRole('menuitem', { name: 'Features' }),
    ).not.toBeInTheDocument();
    await userEvent.click(trigger);

    const features = canvas.getByRole('menuitem', { name: 'Features' });
    const authentication = canvas.getByRole('menuitem', {
      name: 'Authentication workflow',
    });
    await expect(features).toHaveFocus();

    await userEvent.keyboard('{ArrowDown}');
    await expect(authentication).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect(trigger).toHaveFocus();
    await expect(canvas.queryByRole('menu')).not.toBeInTheDocument();
  },
};

export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '18rem' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    const title = canvas.getByRole('heading', {
      level: 1,
      name: 'Authentication workflow',
    });
    const label = title.querySelector('span:last-child');
    const currentLink = canvas.getByRole('link', {
      name: 'Authentication workflow',
    });

    await expect(label).not.toBeNull();
    await expect((label as HTMLElement).scrollWidth).toBeGreaterThan(
      (label as HTMLElement).clientWidth,
    );
    await expect(currentLink).toHaveAttribute(
      'title',
      'Authentication workflow',
    );
  },
};
