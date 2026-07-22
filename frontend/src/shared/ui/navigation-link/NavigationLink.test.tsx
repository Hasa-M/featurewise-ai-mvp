import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NativeNavigationLink } from './NavigationLink';

describe('NativeNavigationLink', () => {
  it('preserves native anchor attributes', () => {
    render(
      <NativeNavigationLink href="/projects" target="_blank">
        Projects
      </NativeNavigationLink>,
    );

    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'href',
      '/projects',
    );
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'target',
      '_blank',
    );
  });
});
