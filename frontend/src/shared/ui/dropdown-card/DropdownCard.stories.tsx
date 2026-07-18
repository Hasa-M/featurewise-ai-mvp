import type { Meta, StoryObj } from '@storybook/react-vite';
import { Building2 } from 'lucide-react';
import { expect, userEvent, within } from 'storybook/test';

import { Button } from '../button';
import { TextInput } from '../text-input';
import { DropdownCard } from './DropdownCard';

const panel = (
  <div
    style={{
      display: 'grid',
      gap: 'var(--space-4)',
      padding: 'var(--space-4)',
    }}
  >
    <TextInput label="Organization name" defaultValue="Northstar Labs" />
    <Button size="small">Save changes</Button>
  </div>
);

const meta = {
  title: 'Shared/DropdownCard',
  component: DropdownCard,
  args: {
    children: panel,
    label: 'Northstar Labs',
    leadingVisual: <Building2 size={16} strokeWidth={1.75} />,
    panelLabel: 'Organization settings',
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: '20rem', padding: 'var(--space-8)' }}>
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof DropdownCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Northstar Labs' });

    await userEvent.click(trigger);
    await expect(
      canvas.getByRole('dialog', { name: 'Organization settings' }),
    ).toBeVisible();
    await expect(canvas.getByLabelText('Organization name')).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument();
    await expect(trigger).toHaveFocus();
  },
};

export const Open: Story = { args: { open: true } };

export const Disabled: Story = { args: { disabled: true } };
