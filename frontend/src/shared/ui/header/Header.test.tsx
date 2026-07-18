import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Header } from './Header';

const breadcrumbItems = [
  { href: '/organizations/northstar', label: 'Northstar Labs' },
  { href: '/projects/featurewise', label: 'Featurewise MVP' },
  { href: '/features/spec-generation', label: 'Spec generation' },
  { label: 'Context' },
] as const;

describe('Header', () => {
  it('composes the breadcrumb and an accessible home link', () => {
    render(<Header breadcrumbItems={breadcrumbItems} homeHref="/" />);

    expect(screen.getByRole('banner')).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
    expect(screen.getByText('Context')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Featurewise home' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(
      screen.getByRole('button', { name: 'Open user settings' }),
    ).toHaveAttribute('title', 'Open user settings');
  });

  it('accepts a custom accessible name for the home link', () => {
    render(
      <Header
        breadcrumbItems={breadcrumbItems}
        homeHref="/workspace"
        homeLabel="Open workspace home"
      />,
    );

    expect(screen.getByRole('link', { name: 'Open workspace home' })).toHaveAttribute(
      'href',
      '/workspace',
    );
  });

  it('exposes the user control through an accessible click callback', async () => {
    const onUserClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Header
        breadcrumbItems={breadcrumbItems}
        homeHref="/"
        onUserClick={onUserClick}
        userLabel="Open account menu"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Open account menu' }));

    expect(onUserClick).toHaveBeenCalledOnce();
  });
});
