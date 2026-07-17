import type { Meta, StoryObj } from '@storybook/react-vite';

import { RichText } from './RichText';

const sampleMarkdown = `## Export generated spec

Users need to export a **validated spec** as Markdown so they can share it with implementation teams.

- Preserve headings and lists
- Include readiness warnings
- Keep structured identifiers in \`inline code\`

> Export reflects the currently selected spec version.`;

const meta = {
  title: 'Shared/Rich text',
  component: RichText,
  args: {
    label: 'Feature context',
    placeholder: 'Describe the feature context',
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
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
    showCharacterCount: { control: 'boolean' },
  },
  parameters: {
    controls: {
      include: [
        'label',
        'placeholder',
        'helperText',
        'errorMessage',
        'showCharacterCount',
        'maxLength',
        'required',
        'readOnly',
        'disabled',
      ],
    },
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(52rem, calc(100vw - 2rem))' }}>
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof RichText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithContent: Story = {
  args: {
    defaultValue: sampleMarkdown,
    helperText:
      'Use the toolbar or Markdown shortcuts to structure the context.',
    maxLength: 2_000,
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

export const ReadOnly: Story = {
  args: {
    defaultValue: sampleMarkdown,
    readOnly: true,
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: sampleMarkdown,
    disabled: true,
  },
};
