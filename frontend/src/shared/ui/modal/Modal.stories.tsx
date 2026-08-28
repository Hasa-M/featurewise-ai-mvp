import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn } from 'storybook/test';

import { Button } from '../button';
import { TextArea } from '../text-area';
import { TextInput } from '../text-input';
import { Modal, type ModalProps } from './Modal';

function ControlledModal(args: ModalProps) {
  const [open, setOpen] = useState(args.open);

  return (
    <Modal
      {...args}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        args.onOpenChange(nextOpen);
      }}
      open={open}
    />
  );
}

function ConfirmationExample() {
  const [open, setOpen] = useState(true);

  return (
    <Modal
      actions={
        <>
          <Button onClick={() => setOpen(false)} variant="secondary">
            Keep feature
          </Button>
          <Button onClick={() => setOpen(false)} variant="danger">
            Delete feature
          </Button>
        </>
      }
      description="This removes the feature and its context artifacts. This action cannot be undone."
      onOpenChange={setOpen}
      open={open}
      size="small"
      title="Delete feature?"
    />
  );
}

function FormExample() {
  const [open, setOpen] = useState(true);

  return (
    <Modal
      actions={
        <>
          <Button onClick={() => setOpen(false)} variant="ghost">
            Cancel
          </Button>
          <Button variant="secondary">Save draft</Button>
          <Button>Create feature</Button>
        </>
      }
      description="Capture the intent now. You can add context artifacts after creating the feature."
      onOpenChange={setOpen}
      open={open}
      title="Create feature"
    >
      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <TextInput
          label="Feature name"
          placeholder="For example, Saved views"
        />
        <TextArea
          label="Feature intent"
          placeholder="Describe the user need and intended outcome"
          rows={5}
        />
      </div>
    </Modal>
  );
}

function InteractiveExample() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="danger">
        Delete feature
      </Button>
      <Modal
        actions={
          <>
            <Button onClick={() => setOpen(false)} variant="secondary">
              Keep feature
            </Button>
            <Button onClick={() => setOpen(false)} variant="danger">
              Delete feature
            </Button>
          </>
        }
        description="This action cannot be undone."
        onOpenChange={setOpen}
        open={open}
        size="small"
        title="Delete feature?"
      />
    </>
  );
}

const meta = {
  title: 'Shared/Modal',
  component: Modal,
  args: {
    children:
      'Analysis settings apply to the next run and do not change existing findings.',
    description:
      'Review how Featurewise will prepare context before starting the next analysis.',
    onOpenChange: fn(),
    open: true,
    size: 'medium',
    title: 'Analysis settings',
  },
  argTypes: {
    actions: {
      control: false,
      description: 'Custom action controls rendered in the modal footer.',
    },
    children: {
      control: 'text',
      description: 'General information, form fields, or other modal content.',
    },
    closeLabel: {
      control: 'text',
      description: 'Accessible label and tooltip for the close control.',
    },
    description: { control: 'text' },
    dismissible: { control: 'boolean' },
    initialFocusRef: { control: false },
    open: { control: 'boolean' },
    size: {
      control: 'select',
      options: ['small', 'medium'],
    },
    title: { control: 'text' },
  },
  parameters: { layout: 'centered' },
  render: (args) => <ControlledModal {...args} />,
  tags: ['autodocs'],
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    actions: (
      <>
        <Button variant="secondary">Cancel</Button>
        <Button>Save settings</Button>
      </>
    ),
  },
};

export const SmallConfirmation: Story = {
  render: () => <ConfirmationExample />,
};

export const MediumForm: Story = {
  render: () => <FormExample />,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('textbox', { name: 'Feature name' }),
    ).toHaveFocus();
  },
};

export const RequiredDecision: Story = {
  args: {
    actions: (
      <>
        <Button variant="secondary">Review context</Button>
        <Button>Continue analysis</Button>
      </>
    ),
    children:
      'Choose how to continue before returning to the analysis flow.',
    description:
      'One uploaded context artifact could not be read and will be excluded.',
    dismissible: false,
    title: 'Context needs attention',
  },
};

export const KeyboardDismissal: Story = {
  render: () => <InteractiveExample />,
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: 'Delete feature' });

    await userEvent.click(trigger);
    await expect(
      canvas.getByRole('dialog', { name: 'Delete feature?' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Close modal' }),
    ).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument();
    await expect(trigger).toHaveFocus();
  },
};
