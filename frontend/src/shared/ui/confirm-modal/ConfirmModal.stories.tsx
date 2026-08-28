import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { ConfirmModal } from './ConfirmModal';

const meta = {
  title: 'Shared/ConfirmModal',
  component: ConfirmModal,
  args: {
    cancelLabel: 'Keep feature',
    confirmLabel: 'Delete feature',
    description: 'The feature workspace will no longer be available.',
    onConfirm: fn(),
    onOpenChange: fn(),
    open: true,
    title: 'Delete feature?',
    variant: 'danger',
  },
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof ConfirmModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Destructive: Story = {};

export const Conflict: Story = {
  args: { errorMessage: 'Feature cannot be deleted while an analysis is active.' },
};

export const Pending: Story = {
  args: { pending: true },
};
