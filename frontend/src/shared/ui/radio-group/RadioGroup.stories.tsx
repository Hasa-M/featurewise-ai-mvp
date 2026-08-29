import type { Meta, StoryObj } from '@storybook/react-vite';

import { Radio, RadioCard, RadioGroup } from './RadioGroup';

const meta = {
  title: 'Shared/Radio group',
  component: RadioGroup,
  args: {
    label: 'Notification level',
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
        <Radio label="All activity" value="all" />
        <Radio label="Important only" value="important" />
      </>
    ),
    defaultValue: 'all',
  },
};

export const Horizontal: Story = {
  args: {
    children: (
      <>
        <Radio label="Compact" value="compact" />
        <Radio label="Comfortable" value="comfortable" />
      </>
    ),
    defaultValue: 'compact',
    label: 'Display density',
    orientation: 'horizontal',
  },
};

export const Cards: Story = {
  args: {
    children: (
      <>
        <RadioCard
          description="Show each item in a compact row."
          label="List"
          value="list"
        />
        <RadioCard
          description="Show each item in a visual card."
          label="Cards"
          value="cards"
        />
      </>
    ),
    defaultValue: 'list',
    description: 'Choose how example items are displayed.',
    label: 'Layout',
  },
};

export const Clearable: Story = {
  args: {
    children: (
      <>
        <RadioCard label="Documentation" value="documentation" />
        <RadioCard label="Design" value="design" />
      </>
    ),
    clearable: true,
    defaultValue: 'documentation',
    label: 'Category filter',
  },
};

export const NoSelection: Story = {
  args: {
    children: (
      <>
        <Radio label="Documentation" value="documentation" />
        <Radio label="Design" value="design" />
      </>
    ),
    clearable: true,
    label: 'Category filter',
  },
};

export const Disabled: Story = {
  args: {
    children: (
      <>
        <RadioCard
          description="Show each item in a compact row."
          label="List"
          value="list"
        />
        <RadioCard
          description="Show each item in a visual card."
          label="Cards"
          value="cards"
        />
      </>
    ),
    defaultValue: 'list',
    disabled: true,
    label: 'Layout',
  },
};
