import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Tag } from './Tag';

describe('Tag', () => {
  it('renders content without a remove control by default', () => {
    render(<Tag>Needs attention</Tag>);

    expect(screen.getByText('Needs attention')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onRemove from an accessible clear control', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(
      <Tag onRemove={onRemove} removeLabel="Remove API context">
        API context
      </Tag>,
    );

    await user.click(screen.getByRole('button', { name: 'Remove API context' }));

    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('does not remove when disabled', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(
      <Tag disabled onRemove={onRemove}>
        Product brief
      </Tag>,
    );

    await user.click(screen.getByRole('button', { name: 'Remove tag' }));
    expect(onRemove).not.toHaveBeenCalled();
  });
});
