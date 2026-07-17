import type { Meta, StoryObj } from '@storybook/react-vite';

import { Toggle } from './Toggle';

const meta = {
  title: 'Shared/Toggle',
  component: Toggle,
  args: {
    label: 'Include context artifacts',
  },
  argTypes: {
    checked: { control: 'boolean' },
    defaultChecked: { control: 'boolean' },
    description: { control: 'text' },
    disabled: { control: 'boolean' },
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
        'disabled',
      ],
    },
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Enabled: Story = {
  args: { defaultChecked: true },
};

export const MediumLabel: Story = {
  args: { labelWeight: 'medium' },
};

export const WithDescription: Story = {
  args: {
    defaultChecked: true,
    description: 'Add uploaded and pasted artifacts to the next spec run.',
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const DisabledEnabled: Story = {
  args: { defaultChecked: true, disabled: true },
};
