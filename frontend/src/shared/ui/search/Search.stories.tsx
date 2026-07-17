import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { Search } from './Search';

const meta = {
  title: 'Shared/Search',
  component: Search,
  args: {
    'aria-label': 'Search features',
    placeholder: 'Search features',
  },
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(22rem, calc(100vw - 2rem))' }}>
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof Search>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    const searchbox = canvas.getByRole('searchbox', { name: 'Search features' });

    await userEvent.type(searchbox, 'readiness');

    await expect(searchbox).toHaveValue('readiness');
  },
};

export const WithClear: Story = {
  args: { onClear: () => undefined, readOnly: true, value: 'readiness' },
};

export const Disabled: Story = {
  args: { disabled: true, value: 'context' },
};
