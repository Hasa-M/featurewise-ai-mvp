import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Logo } from './Logo';

describe('Logo', () => {
  it('renders the wordmark with an accessible product name by default', () => {
    render(<Logo />);

    const logo = screen.getByRole('img', { name: 'Featurewise' });
    expect(logo).toHaveAttribute('width', '186');
    expect(logo).toHaveAttribute('height', '34');
  });

  it('renders the standalone icon with intrinsic dimensions', () => {
    render(<Logo alt={'Featurewise home'} variant={'icon'} />);

    const logo = screen.getByRole('img', { name: 'Featurewise home' });
    expect(logo).toHaveAttribute('width', '32');
    expect(logo).toHaveAttribute('height', '32');
  });

  it('uses the inverse wordmark on dark surfaces', () => {
    const { rerender } = render(<Logo />);
    const defaultSource = screen.getByRole('img', { name: 'Featurewise' }).getAttribute('src');

    rerender(<Logo tone={'inverse'} />);

    expect(screen.getByRole('img', { name: 'Featurewise' })).not.toHaveAttribute(
      'src',
      defaultSource,
    );
  });

  it('can be decorative when adjacent content names the product', () => {
    render(<Logo alt={''} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(document.querySelector('img')).toHaveAttribute('alt', '');
  });
});
