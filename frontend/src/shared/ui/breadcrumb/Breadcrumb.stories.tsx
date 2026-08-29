import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileText, FolderClosed, FolderKanban } from 'lucide-react';
import { expect, userEvent } from 'storybook/test';

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
    href: '#resources',
    icon: <FolderClosed size={14} strokeWidth={1.75} />,
    kind: 'folder',
    label: 'Resources',
  },
  {
    href: '#design-system',
    icon: <FolderKanban size={14} strokeWidth={1.75} />,
    kind: 'item',
    label: 'Design system',
  },
  {
    href: '#components',
    icon: <FolderClosed size={14} strokeWidth={1.75} />,
    kind: 'folder',
    label: 'Components',
  },
  {
    href: '#navigation',
    icon: <FileText size={14} strokeWidth={1.75} />,
    kind: 'item',
    label: 'Navigation',
  },
  {
    href: '#breadcrumb',
    icon: <FolderClosed size={14} strokeWidth={1.75} />,
    kind: 'folder',
    label: 'Breadcrumb',
  },
  {
    href: '#examples',
    icon: <FileText size={14} strokeWidth={1.75} />,
    kind: 'item',
    label: 'Examples',
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
      canvas.queryByRole('menuitem', { name: 'Components' }),
    ).not.toBeInTheDocument();
    await userEvent.click(trigger);

    const components = canvas.getByRole('menuitem', { name: 'Components' });
    const navigation = canvas.getByRole('menuitem', {
      name: 'Navigation',
    });
    await expect(components).toHaveFocus();

    await userEvent.keyboard('{ArrowDown}');
    await expect(navigation).toHaveFocus();
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
    await expect(label).not.toBeNull();
    await expect((label as HTMLElement).scrollWidth).toBeGreaterThan(
      (label as HTMLElement).clientWidth,
    );
    await expect(label).not.toHaveAttribute('title');

    await userEvent.hover(label as HTMLElement);
    await expect(label).toHaveAttribute('title', 'Authentication workflow');

    await userEvent.unhover(label as HTMLElement);
    await expect(label).not.toHaveAttribute('title');
  },
};
