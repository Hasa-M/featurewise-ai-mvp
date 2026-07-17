import type { Meta, StoryObj } from '@storybook/react-vite';

import { Radio, RadioCard, RadioGroup } from './RadioGroup';

const meta = {
  title: 'Shared/Radio group',
  component: RadioGroup,
  args: {
    label: 'Generation mode',
  },
  argTypes: {
    clearable: { control: 'boolean' },
    defaultValue: { control: 'text' },
    description: { control: 'text' },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
    orientation: {
      control: 'select',
      options: ['vertical', 'horizontal'],
    },
    value: { control: false },
  },
  parameters: {
    controls: {
      include: [
        'label',
        'description',
        'defaultValue',
        'orientation',
        'clearable',
        'disabled',
      ],
    },
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <>
        <Radio label="Generate a new spec" value="generation" />
        <Radio label="Consolidate validated updates" value="consolidation" />
      </>
    ),
    defaultValue: 'generation',
  },
};

export const Horizontal: Story = {
  args: {
    children: (
      <>
        <Radio label="Feature" value="feature" />
        <Radio label="Feature update" value="update" />
      </>
    ),
    defaultValue: 'feature',
    orientation: 'horizontal',
  },
};

export const Cards: Story = {
  args: {
    children: (
      <>
        <RadioCard
          description="Create a readiness spec for a brand-new feature."
          label="New feature"
          value="new"
        />
        <RadioCard
          description="Capture an increment against an existing feature baseline."
          label="Feature update"
          value="update"
        />
      </>
    ),
    defaultValue: 'new',
    description: 'Choose the target that matches the product intent.',
    label: 'Spec target',
  },
};

export const Clearable: Story = {
  args: {
    children: (
      <>
        <RadioCard label="Ready" value="ready" />
        <RadioCard label="Needs attention" value="needs-attention" />
      </>
    ),
    clearable: true,
    defaultValue: 'ready',
    label: 'Readiness filter',
  },
};

export const NoSelection: Story = {
  args: {
    children: (
      <>
        <Radio label="Ready" value="ready" />
        <Radio label="Blocked" value="blocked" />
      </>
    ),
    clearable: true,
    label: 'Readiness filter',
  },
};

export const Disabled: Story = {
  args: {
    children: (
      <>
        <RadioCard
          description="This target is already selected."
          label="Feature"
          value="feature"
        />
        <RadioCard
          description="Updates are unavailable for this feature."
          label="Feature update"
          value="update"
        />
      </>
    ),
    defaultValue: 'feature',
    disabled: true,
    label: 'Spec target',
  },
};
