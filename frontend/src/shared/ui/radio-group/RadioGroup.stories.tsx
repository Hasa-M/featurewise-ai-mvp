import type { Meta, StoryObj } from '@storybook/react-vite';

import { Radio, RadioCard, RadioGroup } from './RadioGroup';

const meta = {
  title: 'Shared/Radio group',
  component: RadioGroup,
  args: {
    label: 'Finding severity',
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
        <Radio label="High" value="high" />
        <Radio label="Medium" value="medium" />
      </>
    ),
    defaultValue: 'high',
  },
};

export const Horizontal: Story = {
  args: {
    children: (
      <>
        <Radio label="Specification" value="specification" />
        <Radio label="Supporting context" value="context" />
      </>
    ),
    defaultValue: 'specification',
    orientation: 'horizontal',
  },
};

export const Cards: Story = {
  args: {
    children: (
      <>
        <RadioCard
          description="Check the user-authored specification."
          label="Specification"
          value="specification"
        />
        <RadioCard
          description="Check supporting notes and uploaded files."
          label="Context"
          value="context"
        />
      </>
    ),
    defaultValue: 'specification',
    description: 'Choose which input surface to inspect.',
    label: 'Analysis source',
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
          label="Specification"
          value="specification"
        />
        <RadioCard
          description="Context selection is unavailable."
          label="Context"
          value="context"
        />
      </>
    ),
    defaultValue: 'specification',
    disabled: true,
    label: 'Analysis source',
  },
};
