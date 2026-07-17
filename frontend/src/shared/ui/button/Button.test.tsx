import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Plus } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './Button';

describe('Button', () => {
  it('runs its click handler', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={onClick}>Create feature</Button>);
    await user.click(screen.getByRole('button', { name: 'Create feature' }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled and busy while loading', () => {
    render(<Button loading>Create feature</Button>);

    expect(screen.getByRole('button', { name: 'Create feature' })).toBeDisabled();
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('renders icons through explicit left and right slots', () => {
    render(
      <Button
        leadingIcon={<Plus data-testid="leading-icon" size={16} />}
        trailingIcon={<Plus data-testid="trailing-icon" size={16} />}
      >
        Create feature
      </Button>,
    );

    expect(screen.getByTestId('leading-icon')).toBeInTheDocument();
    expect(screen.getByTestId('trailing-icon')).toBeInTheDocument();
  });

  it('supports an accessible icon-only layout with normal variants', () => {
    render(
      <Button
        aria-label="Create feature"
        isIcon
        title="Create feature"
        variant="secondary"
      >
        <Plus size={18} aria-hidden="true" />
      </Button>,
    );

    expect(screen.getByRole('button', { name: 'Create feature' })).toHaveAttribute(
      'title',
      'Create feature',
    );
  });
});
