import type { Meta, StoryObj } from '@storybook/react-vite';

import { Checkbox } from './Checkbox';

const meta = {
  title: 'Shared/Checkbox',
  component: Checkbox,
  args: {
    label: 'Mark readiness checklist item complete',
  },
  argTypes: {
    checked: { control: 'boolean' },
    defaultChecked: { control: 'boolean' },
    description: { control: 'text' },
    disabled: { control: 'boolean' },
    indeterminate: { control: 'boolean' },
    label: { control: 'text' },
    labelWeight: {
      control: 'select',
      options: ['regular', 'medium'],
    },
  },
  parameters: {
    controls: {
      include: [
        'label',
        'labelWeight',
        'description',
        'checked',
        'defaultChecked',
        'indeterminate',
        'disabled',
      ],
    },
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Checked: Story = {
  args: { defaultChecked: true },
};

export const Indeterminate: Story = {
  args: {
    indeterminate: true,
    label: 'Select all context artifacts',
  },
};

export const MediumLabel: Story = {
  args: { labelWeight: 'medium' },
};

export const WithDescription: Story = {
  args: {
    description: 'Confirm the acceptance criteria are specific and testable.',
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const DisabledChecked: Story = {
  args: { defaultChecked: true, disabled: true },
};
