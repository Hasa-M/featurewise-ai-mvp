import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Header } from './Header';

describe('Header', () => {
  it('renders the start and user controls with an accessible home link', () => {
    render(
      <Header
        dropdownCardProps={{
          children: <span>Organization settings</span>,
          label: 'Northstar Labs',
          panelLabel: 'Organization settings',
        }}
        homeHref="/"
        userControl={<button type="button">Open user menu</button>}
      />,
    );

    expect(screen.getByRole('banner')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Northstar Labs' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Toggle sidebar' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Open user menu' })).toBeVisible();
    expect(
      screen.queryByRole('navigation', { name: 'Breadcrumb' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Featurewise home' })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('accepts a custom accessible name for the home link', () => {
    render(
      <Header
        dropdownCardProps={{
          children: <span>Workspace settings</span>,
          label: 'Workspace',
          panelLabel: 'Workspace settings',
        }}
        homeHref="/workspace"
        homeLabel="Open workspace home"
        userControl={<button type="button">User</button>}
      />,
    );

    expect(screen.getByRole('link', { name: 'Open workspace home' })).toHaveAttribute(
      'href',
      '/workspace',
    );
  });

  it('exposes the future sidebar toggle callback', async () => {
    const onSidebarToggle = vi.fn();
    const user = userEvent.setup();
    render(
      <Header
        dropdownCardProps={{
          children: <span>Organization settings</span>,
          label: 'Northstar Labs',
          panelLabel: 'Organization settings',
        }}
        homeHref="/"
        onSidebarToggle={onSidebarToggle}
        userControl={<button type="button">User</button>}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
    expect(onSidebarToggle).toHaveBeenCalledOnce();
  });
});
