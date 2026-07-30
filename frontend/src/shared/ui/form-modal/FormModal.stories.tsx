import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { TextArea } from '../text-area';
import { TextInput } from '../text-input';
import { FormModal } from './FormModal';

const meta = {
  title: 'Shared/FormModal',
  component: FormModal,
  args: {
    children: (
      <>
        <TextInput label='Feature title' value='Saved views' />
        <TextArea label='Feature brief' value='Let users return to useful filters.' />
      </>
    ),
    description: 'Update bounded feature metadata.',
    onOpenChange: fn(),
    onReset: fn(),
    onSubmit: (event) => event.preventDefault(),
    open: true,
    submitLabel: 'Save changes',
    title: 'Edit feature',
  },
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof FormModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Submitting: Story = {
  args: { submitting: true },
};

export const WithError: Story = {
  args: { errorMessage: 'The feature could not be saved.' },
};
