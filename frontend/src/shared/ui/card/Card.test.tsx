import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Card } from './Card';

describe('Card', () => {
  it('renders arbitrary children in a non-interactive wrapper', () => {
    render(
      <Card>
        <article aria-label="Feature summary">Checkout recovery</article>
      </Card>,
    );

    expect(
      screen.getByRole('article', { name: 'Feature summary' }),
    ).toHaveTextContent('Checkout recovery');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('applies fill, fit-content, and fixed dimensions', () => {
    const { rerender } = render(
      <Card height="100%" width="100%">
        Fill card
      </Card>,
    );

    expect(screen.getByText('Fill card')).toHaveStyle({
      height: '100%',
      width: '100%',
    });

    rerender(
      <Card height="fit-content" width="fit-content">
        Fit card
      </Card>,
    );

    expect(screen.getByText('Fit card')).toHaveStyle({
      height: 'fit-content',
      width: 'fit-content',
    });

    rerender(
      <Card height={180} width={320}>
        Fixed card
      </Card>,
    );

    expect(screen.getByText('Fixed card')).toHaveStyle({
      height: '180px',
      width: '320px',
    });
  });

  it('uses native button behavior when clickable', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Card aria-label="Open feature details" onClick={onClick}>
        Checkout recovery
      </Card>,
    );

    const card = screen.getByRole('button', {
      name: 'Open feature details',
    });
    expect(card).toHaveAttribute('type', 'button');

    await user.click(card);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not activate a disabled interactive card', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Card
        aria-label="Open feature details"
        disabled
        onClick={onClick}
      >
        Checkout recovery
      </Card>,
    );

    await user.click(
      screen.getByRole('button', { name: 'Open feature details' }),
    );
    expect(onClick).not.toHaveBeenCalled();
  });
});
