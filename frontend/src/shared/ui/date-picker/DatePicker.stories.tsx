import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { useState } from 'react';

import { DatePicker } from './DatePicker';
import type { DateRangeValue, RangeDatePickerProps, SingleDatePickerProps } from './DatePicker';

function ControlledSingle(args: SingleDatePickerProps) {
  const [value, setValue] = useState(args.value ?? '');
  return <DatePicker {...args} onChange={setValue} value={value} />;
}

function ControlledRange(args: RangeDatePickerProps) {
  const [value, setValue] = useState<DateRangeValue>(args.value);
  return <DatePicker {...args} mode="range" onChange={setValue} value={value} />;
}

const meta = {
  title: 'Shared/DatePicker',
  component: DatePicker,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(24rem, calc(100vw - 2rem))', minHeight: '29rem' }}>
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<SingleDatePickerProps>;

export default meta;
type SingleStory = StoryObj<SingleDatePickerProps>;
type RangeStory = StoryObj<RangeDatePickerProps>;

export const Single: SingleStory = {
  args: {
    defaultMonth: '2026-07-01',
    label: 'Target date',
    locale: 'en-GB',
    onChange: () => undefined,
  },
  render: (args) => <ControlledSingle {...args} />,
  play: async ({ canvas, userEvent }) => {
    const control = canvas.getByRole('button', { name: 'Target date' });

    await userEvent.click(control);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Friday, 17 July 2026' }),
    );

    await expect(control).toHaveTextContent('17 Jul 2026');
    await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument();
  },
};

export const LongDistanceNavigation: SingleStory = {
  args: {
    defaultMonth: '2026-07-01',
    helperText: 'Open the month and year heading to jump directly to another year.',
    label: 'Target date',
    locale: 'en-GB',
    maxDate: '2045-12-31',
    minDate: '2000-01-01',
    onChange: () => undefined,
  },
  render: (args) => <ControlledSingle {...args} />,
};

export const Range: RangeStory = {
  args: {
    defaultMonth: '2026-07-01',
    helperText: 'Choose the first and last day. Use the month and year heading for distant dates.',
    label: 'Review window',
    locale: 'en-GB',
    mode: 'range',
    onChange: () => undefined,
    value: { end: '', start: '' },
  },
  render: (args) => <ControlledRange {...args} />,
};

export const DisabledOddDates: SingleStory = {
  args: {
    defaultMonth: '2026-07-01',
    helperText: 'Only even-numbered calendar days are available.',
    isDateDisabled: (date) => date.getDate() % 2 === 1,
    label: 'Checkpoint date',
    locale: 'en-GB',
    onChange: () => undefined,
  },
  render: (args) => <ControlledSingle {...args} />,
};

const reservedDates = new Set(['2026-07-08', '2026-07-14', '2026-07-27']);

export const DisabledFromAList: SingleStory = {
  args: {
    defaultMonth: '2026-07-01',
    helperText: 'Dates already assigned to a checkpoint are unavailable.',
    isDateDisabled: (_date, isoDate) => reservedDates.has(isoDate),
    label: 'Checkpoint date',
    locale: 'en-GB',
    onChange: () => undefined,
  },
  render: (args) => <ControlledSingle {...args} />,
};

export const EveryTwentiethDisabled: RangeStory = {
  args: {
    defaultMonth: '2026-07-01',
    isDateDisabled: (date) => date.getDate() === 20,
    label: 'Review window',
    locale: 'en-GB',
    mode: 'range',
    onChange: () => undefined,
    value: { end: '', start: '' },
  },
  render: (args) => <ControlledRange {...args} />,
};

export const Error: SingleStory = {
  args: {
    defaultMonth: '2026-07-01',
    errorMessage: 'Select a target date before continuing.',
    label: 'Target date',
    locale: 'en-GB',
    onChange: () => undefined,
    required: true,
  },
  render: (args) => <ControlledSingle {...args} />,
};

export const Disabled: SingleStory = {
  args: {
    disabled: true,
    label: 'Target date',
    locale: 'en-GB',
    onChange: () => undefined,
    value: '2026-07-17',
  },
};
