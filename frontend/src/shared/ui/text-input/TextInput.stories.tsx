import type { Meta, StoryObj } from '@storybook/react-vite';

import { TextInput } from './TextInput';

const meta = {
  title: 'Shared/Text input',
  component: TextInput,
  args: {
    label: 'Feature name',
    maxFractionDigits: 4,
    valueType: 'text',
  },
  argTypes: {
    disabled: { control: 'boolean' },
    errorMessage: { control: 'text' },
    helperText: { control: 'text' },
    label: {
      control: 'text',
      description: 'Optional visible label. Provide aria-label when omitted.',
    },
    maxFractionDigits: {
      control: { min: 0, step: 1, type: 'number' },
      description:
        'Maximum fractional digits for decimal and percentage values.',
    },
    placeholder: {
      control: 'text',
      description: 'Overrides the placeholder inferred from valueType.',
    },
    required: { control: 'boolean' },
    valueType: {
      control: 'select',
      options: ['text', 'integer', 'decimal', 'percentage', 'password'],
    },
  },
  parameters: {
    controls: {
      include: [
        'label',
        'valueType',
        'maxFractionDigits',
        'placeholder',
        'helperText',
        'errorMessage',
        'required',
        'disabled',
      ],
    },
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(22rem, calc(100vw - 2rem))' }}>
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof TextInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Text: Story = {};

export const Integer: Story = {
  args: {
    label: 'Estimated story points',
    valueType: 'integer',
  },
};

export const Decimal: Story = {
  args: {
    helperText: 'Accepts up to 4 fractional digits.',
    label: 'Estimated days',
    valueType: 'decimal',
  },
};

export const Percentage: Story = {
  args: {
    helperText: 'Accepts up to 4 fractional digits.',
    label: 'Readiness confidence',
    valueType: 'percentage',
  },
};

export const Password: Story = {
  args: {
    autoComplete: 'current-password',
    label: 'Password',
    valueType: 'password',
  },
};

export const DisabledPassword: Story = {
  args: {
    disabled: true,
    label: 'Password',
    value: 'Readiness-2026',
    valueType: 'password',
  },
};

export const Required: Story = {
  args: {
    label: 'Feature name',
    required: true,
  },
};

export const WithoutLabel: Story = {
  args: {
    'aria-label': 'Search features',
    label: undefined,
    placeholder: 'Search features',
  },
};

export const WithHelperText: Story = {
  args: {
    helperText: 'Use the name shown in the current product brief.',
  },
};

export const Error: Story = {
  args: {
    errorMessage: 'Enter a feature name before continuing.',
    required: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: 'Export generated spec',
  },
};
