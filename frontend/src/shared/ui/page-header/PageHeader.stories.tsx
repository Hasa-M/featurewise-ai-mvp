import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileText, FolderClosed, FolderKanban, Pencil, Trash2 } from 'lucide-react';

import { Breadcrumb } from '../breadcrumb';
import { Button } from '../button';
import { Tag } from '../tag';
import { PageHeader } from './PageHeader';

const featureBreadcrumb = (
  <Breadcrumb
    items={[
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
    ]}
    titleId="feature-page-title"
  />
);

const meta = {
  title: 'Global/PageHeader',
  component: PageHeader,
  args: {
    actions: (
      <>
        <Button
          leadingIcon={<Pencil size={16} strokeWidth={1.75} />}
          variant="secondary"
        >
          Edit feature
        </Button>
        <Button
          leadingIcon={<Trash2 size={16} strokeWidth={1.75} />}
          variant="danger"
        >
          Delete feature
        </Button>
      </>
    ),
    breadcrumb: featureBreadcrumb,
    subtitle:
      'Review the available context and move this feature toward implementation readiness.',
  },
  decorators: [
    (Story) => (
      <div
        style={{
          background: 'var(--surface-canvas)',
          minHeight: '16rem',
          width: '100%',
        }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '26rem' }}>
        <Story />
      </div>
    ),
  ],
};

export const MixedActionContent: Story = {
  args: {
    actions: (
      <>
        <Tag>FEAT-5831</Tag>
        <Button variant="secondary">Edit feature</Button>
        <Button variant="danger">Delete feature</Button>
      </>
    ),
  },
};

export const WithoutSubtitle: Story = {
  args: {
    subtitle: undefined,
  },
};

export const WithoutActions: Story = {
  args: {
    actions: undefined,
  },
};
