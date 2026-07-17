import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { Select } from './Select';
import type { MultipleSelectProps, SingleSelectProps } from './Select';

const readinessOptions = [
  { label: 'Ready', value: 'ready' },
  { label: 'Needs attention', value: 'needs-attention' },
  { label: 'Blocked', value: 'blocked' },
  { label: 'In progress', value: 'in-progress' },
  { label: 'Draft', value: 'draft' },
];

const contextOptions = Array.from({ length: 14 }, (_, index) => ({
  label: `Context artifact ${index + 1}`,
  value: `context-${index + 1}`,
}));

function ControlledSingle(args: SingleSelectProps) {
  const [value, setValue] = useState(args.value ?? '');
  return <Select {...args} onChange={setValue} value={value} />;
}

function ControlledMultiple(args: MultipleSelectProps) {
  const [value, setValue] = useState(
    args.value.length > 0 ? args.value : ['context-1', 'context-3'],
  );
  return (
    <Select
      {...args}
      mode="multiple"
      onChange={setValue}
      value={value}
    />
  );
}

const meta = {
  title: 'Shared/Select',
  component: Select,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(24rem, calc(100vw - 2rem))' }}>
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<SingleSelectProps>;

export default meta;
type Story = StoryObj<SingleSelectProps>;
type MultipleStory = StoryObj<MultipleSelectProps>;

export const Single: Story = {
  args: {
    label: 'Readiness',
    onChange: () => undefined,
    options: readinessOptions,
  },
  render: (args) => <ControlledSingle {...args} />,
};

export const MultipleWithSearch: MultipleStory = {
  args: {
    label: 'Context artifacts',
    mode: 'multiple',
    onChange: () => undefined,
    options: contextOptions,
    value: [],
  },
  render: (args) => <ControlledMultiple {...args} />,
};

export const WithoutTitle: Story = {
  args: {
    'aria-label': 'Readiness',
    onChange: () => undefined,
    options: readinessOptions,
  },
  render: (args) => <ControlledSingle {...args} />,
};

export const Error: Story = {
  args: {
    errorMessage: 'Select a readiness state before continuing.',
    label: 'Readiness',
    onChange: () => undefined,
    options: readinessOptions,
    required: true,
  },
  render: (args) => <ControlledSingle {...args} />,
};

export const Disabled: Story = {
  args: {
    disabled: true,
    label: 'Readiness',
    onChange: () => undefined,
    options: readinessOptions,
    value: 'draft',
  },
};

export const Empty: Story = {
  args: {
    label: 'Readiness',
    onChange: () => undefined,
    options: [],
  },
  render: (args) => <ControlledSingle {...args} />,
};
