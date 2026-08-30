import type { Meta, StoryObj } from '@storybook/react-vite';

import { TextArea } from './TextArea';

const meta = {
  title: 'Shared/Text area',
  component: TextArea,
  args: {
    label: 'Feature specification',
    placeholder: 'Describe the user need and expected outcome',
    rows: 5,
  },
  argTypes: {
    disabled: { control: 'boolean' },
    errorMessage: { control: 'text' },
    helperText: { control: 'text' },
    label: {
      control: 'text',
      description: 'Optional visible label. Provide aria-label when omitted.',
    },
    maxLength: { control: { min: 1, step: 1, type: 'number' } },
    required: { control: 'boolean' },
    rows: { control: { min: 2, step: 1, type: 'number' } },
    showCharacterCount: { control: 'boolean' },
  },
  parameters: {
    controls: {
      include: [
        'label',
        'placeholder',
        'rows',
        'helperText',
        'errorMessage',
        'showCharacterCount',
        'maxLength',
        'required',
        'disabled',
      ],
    },
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(32rem, calc(100vw - 2rem))' }}>
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof TextArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithCharacterCount: Story = {
  args: {
    defaultValue: 'Users need a clear feature summary.',
    helperText: 'Include the user problem, constraints, and expected outcome.',
    maxLength: 280,
    showCharacterCount: true,
  },
};

export const Required: Story = {
  args: {
    required: true,
  },
};

export const WithoutLabel: Story = {
  args: {
    'aria-label': 'Additional context',
    label: undefined,
  },
};

export const Error: Story = {
  args: {
    defaultValue: 'Export screen',
    errorMessage: 'Describe the user need before continuing.',
    required: true,
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: 'This example is unavailable for editing.',
    disabled: true,
    showCharacterCount: true,
  },
};
