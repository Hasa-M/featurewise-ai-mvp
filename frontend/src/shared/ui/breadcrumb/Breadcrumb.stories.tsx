import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Breadcrumb, type BreadcrumbItems } from './Breadcrumb';

const defaultItems = [
  { href: '#organization', label: 'Northstar Labs' },
  { href: '#project', label: 'Featurewise MVP' },
  { href: '#feature', label: 'Spec generation' },
  { label: 'Context' },
] satisfies BreadcrumbItems;

const meta = {
  title: 'Layout/Breadcrumb',
  component: Breadcrumb,
  args: { items: defaultItems },
  decorators: [
    (Story) => (
      <div
        style={{
          background: 'var(--surface-brand-strong)',
          padding: 'var(--space-4)',
          width: '48rem',
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

export const Default: Story = {};

export const LongLabels: Story = {
  args: {
    items: [
      { href: '#organization', label: 'Product Development Organization' },
      { href: '#project', label: 'Customer onboarding modernization' },
      { href: '#feature', label: 'Implementation-readiness specification' },
      { label: 'Context artifacts and unresolved questions' },
    ],
  },
};

export const CompactOverflow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '22rem' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', {
      name: 'Show hidden breadcrumb levels',
    });

    await userEvent.click(trigger);

    const project = canvas.getByRole('menuitem', { name: 'Featurewise MVP' });
    const feature = canvas.getByRole('menuitem', { name: 'Spec generation' });
    await expect(project).toHaveFocus();

    await userEvent.keyboard('{ArrowDown}');
    await expect(feature).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    await expect(trigger).toHaveFocus();
    await expect(canvas.queryByRole('menu')).not.toBeInTheDocument();
  },
};

export const SinglePage: Story = {
  args: { items: [{ label: 'Organizations' }] },
};
