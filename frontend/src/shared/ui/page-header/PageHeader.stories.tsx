import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Download,
  FileText,
  FolderClosed,
  FolderKanban,
  Plus,
} from 'lucide-react';

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
          leadingIcon={<Download size={16} strokeWidth={1.75} />}
          variant="secondary"
        >
          Export
        </Button>
        <Button leadingIcon={<Plus size={16} strokeWidth={1.75} />}>
          Add context
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
        <Tag>Draft</Tag>
        <Button variant="secondary">Validate</Button>
        <Button>Generate spec</Button>
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
