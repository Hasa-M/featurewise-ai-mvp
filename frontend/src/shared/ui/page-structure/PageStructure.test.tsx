import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PageStructure, type PageStructureProps } from './PageStructure';

const headerProps: PageStructureProps['headerProps'] = {
  dropdownCardProps: {
    children: <span>Organization settings</span>,
    label: 'Northstar Labs',
    panelLabel: 'Organization settings',
  },
  homeHref: '/',
  userControl: <button type="button">Open user menu</button>,
};

const sidebarProps: PageStructureProps['sidebarProps'] = {
  nodes: [
    {
      addAction: {
        'aria-label': 'Add project',
        href: '#new-project',
      },
      children: [
        {
          children: [
            {
              addAction: {
                'aria-label': 'Add feature',
                href: '#new-feature',
              },
              children: [],
              id: 'features',
              label: 'Features',
              listAction: {
                'aria-label': 'View features',
                href: '#features',
              },
              type: 'node',
            },
          ],
          id: 'northstar',
          label: 'Northstar mobile',
          menuAction: {
            'aria-label': 'Open project menu',
            onClick: () => undefined,
          },
          pageAction: {
            'aria-label': 'Open project page',
            href: '#northstar',
          },
          type: 'group',
        },
      ],
      id: 'projects',
      label: 'Projects',
      listAction: {
        'aria-label': 'View projects',
        href: '#projects',
      },
      type: 'node',
    },
  ],
};

describe('PageStructure', () => {
  it('composes the global regions around page content', () => {
    render(
      <PageStructure headerProps={headerProps} sidebarProps={sidebarProps}>
        <h1>Feature overview</h1>
      </PageStructure>,
    );

    expect(screen.getByRole('banner')).toBeVisible();
    expect(
      screen.getByRole('navigation', { name: 'Workspace navigation' }),
    ).toBeVisible();
    expect(screen.getByRole('main')).toContainElement(
      screen.getByRole('heading', { name: 'Feature overview' }),
    );
    expect(screen.getByRole('button', { name: 'Hide sidebar' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('keeps the sidebar mounted and preserves its state while hidden', async () => {
    const onSidebarOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <PageStructure
        headerProps={headerProps}
        onSidebarOpenChange={onSidebarOpenChange}
        sidebarProps={sidebarProps}
      >
        Page content
      </PageStructure>,
    );

    const project = screen.getByRole('button', { name: 'Northstar mobile' });
    await user.click(project);
    expect(project).toHaveAttribute('aria-expanded', 'true');

    const hideButton = screen.getByRole('button', { name: 'Hide sidebar' });
    const sidebarRegion = document.getElementById(
      hideButton.getAttribute('aria-controls') ?? '',
    );
    await user.click(hideButton);

    expect(sidebarRegion).toHaveAttribute('hidden');
    expect(onSidebarOpenChange).toHaveBeenLastCalledWith(false);

    await user.click(screen.getByRole('button', { name: 'Show sidebar' }));

    expect(sidebarRegion).not.toHaveAttribute('hidden');
    expect(project).toHaveAttribute('aria-expanded', 'true');
    expect(onSidebarOpenChange).toHaveBeenLastCalledWith(true);
  });

  it('reports controlled changes without changing the supplied state', async () => {
    const onSidebarOpenChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <PageStructure
        headerProps={headerProps}
        onSidebarOpenChange={onSidebarOpenChange}
        sidebarOpen
        sidebarProps={sidebarProps}
      >
        Page content
      </PageStructure>,
    );

    await user.click(screen.getByRole('button', { name: 'Hide sidebar' }));

    expect(onSidebarOpenChange).toHaveBeenCalledWith(false);
    expect(
      screen.getByRole('navigation', { name: 'Workspace navigation' }),
    ).toBeVisible();

    rerender(
      <PageStructure
        headerProps={headerProps}
        onSidebarOpenChange={onSidebarOpenChange}
        sidebarOpen={false}
        sidebarProps={sidebarProps}
      >
        Page content
      </PageStructure>,
    );

    expect(screen.getByRole('button', { name: 'Show sidebar' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
