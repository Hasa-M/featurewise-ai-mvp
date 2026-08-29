import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  Sidebar,
} from './Sidebar';
import type { SidebarNodeItem } from './Sidebar';

const nodes: readonly SidebarNodeItem[] = [
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
              'aria-label': 'Add feature to Northstar',
              href: '#new-northstar-feature',
            },
            children: [
              {
                children: [],
                emptyMessage: 'No feature sections yet',
                id: 'feature:FEAT-5831',
                label: 'Authentication workflow',
                menuAction: {
                  'aria-label': 'Open authentication menu',
                  onClick: () => undefined,
                },
                pageAction: {
                  'aria-label': 'Open authentication page',
                  href: '/projects/PRJ-204/features/FEAT-5831',
                },
                type: 'group',
              },
            ],
            id: 'features',
            label: 'Features',
            listAction: {
              'aria-label': 'View Northstar features',
              href: '#northstar-features',
            },
            type: 'node',
          },
        ],
        id: 'project:PRJ-204',
        label: 'Northstar mobile',
        menuAction: {
          'aria-label': 'Open Northstar menu',
          onClick: () => undefined,
        },
        pageAction: {
          'aria-label': 'Open Northstar page',
          href: '/projects/PRJ-204',
        },
        type: 'group',
      },
    ],
    id: 'projects',
    label: 'Projects',
    listAction: {
      'aria-label': 'View all projects',
      href: '#projects',
    },
    type: 'node',
  },
];

describe('Sidebar', () => {
  it('renders typed nodes and groups as disclosures with separate actions', () => {
    render(<Sidebar navigationLabel="Product navigation" nodes={nodes} />);

    const navigation = screen.getByRole('navigation', {
      name: 'Product navigation',
    });
    expect(
      within(navigation).getByRole('button', { name: 'Projects' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      within(navigation).getByRole('button', { name: 'Northstar mobile' }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(
      within(navigation).getByRole('link', { name: 'View all projects' }),
    ).toHaveAttribute('href', '#projects');
    expect(
      within(navigation).getByRole('link', { name: 'View all projects' }),
    ).toHaveAttribute('data-visibility', 'hover');
    expect(
      within(navigation).getByRole('link', { name: 'Add project' }),
    ).toHaveAttribute('data-visibility', 'always');
    expect(
      within(navigation).getByRole('button', { name: 'Northstar mobile' }),
    ).toHaveTextContent(/^Northstar mobile$/);
  });

  it('keeps disclosure actions independent and reports item state changes', async () => {
    const onItemOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Sidebar
        nodes={nodes}
        onItemOpenChange={onItemOpenChange}
      />,
    );

    const projectTrigger = screen.getByRole('button', {
      name: 'Northstar mobile',
    });
    const viewAction = screen.getByRole('link', {
      name: 'Open Northstar page',
    });

    await user.click(viewAction);
    expect(projectTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(onItemOpenChange).not.toHaveBeenCalled();

    await user.click(projectTrigger);
    expect(projectTrigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Features' })).toBeVisible();
    expect(onItemOpenChange).toHaveBeenCalledWith('project:PRJ-204', true);
    expect(
      screen.getByRole('button', { name: 'Open Northstar menu' }),
    ).toHaveAttribute('data-visibility', 'hover');
    expect(viewAction).toHaveAttribute('data-visibility', 'hover');
  });

  it('renders leaf nodes as links', () => {
    render(
      <Sidebar
        nodes={[
          {
            children: [
              {
                href: '#guide',
                id: 'guide',
                label: 'Guide',
                type: 'leaf',
              },
            ],
            defaultOpen: true,
            id: 'resources',
            label: 'Resources',
            type: 'node',
          },
        ]}
      />,
    );

    expect(screen.getByRole('link', { name: 'Guide' })).toHaveAttribute(
      'href',
      '#guide',
    );
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
  });

  it('marks the active leaf as the current page', () => {
    render(
      <Sidebar
        activeItemId="guide"
        nodes={[
          {
            children: [
              {
                href: '#guide',
                id: 'guide',
                label: 'Guide',
                type: 'leaf',
              },
            ],
            defaultOpen: true,
            id: 'resources',
            label: 'Resources',
            type: 'node',
          },
        ]}
      />,
    );

    expect(screen.getByRole('link', { name: 'Guide' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      screen
        .getByRole('button', { name: 'Resources' })
        .closest('[data-selection]'),
    ).toHaveAttribute('data-selection', 'ancestor');
  });

  it('distinguishes a current accordion from its selected ancestors', async () => {
    const user = userEvent.setup();
    render(<Sidebar activeItemId="feature:FEAT-5831" nodes={nodes} />);

    await user.click(
      screen.getByRole('button', { name: 'Northstar mobile' }),
    );

    expect(
      screen
        .getByRole('button', { name: 'Authentication workflow' })
        .closest('[data-selection]'),
    ).toHaveAttribute('data-selection', 'current');

    for (const label of ['Projects', 'Northstar mobile', 'Features']) {
      expect(
        screen
          .getByRole('button', { name: label })
          .closest('[data-selection]'),
      ).toHaveAttribute('data-selection', 'ancestor');
    }
  });

  it('keeps nested disclosure state independent', async () => {
    const user = userEvent.setup();
    render(<Sidebar nodes={nodes} />);

    const project = screen.getByRole('button', { name: 'Northstar mobile' });
    expect(project).toHaveAttribute('aria-expanded', 'false');
    await user.click(project);

    expect(project).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('button', { name: 'Authentication workflow' }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('switches default folder icons with disclosure state', async () => {
    const user = userEvent.setup();
    const { container } = render(<Sidebar nodes={nodes} />);

    expect(container.querySelectorAll('.lucide-folder-open')).toHaveLength(2);
    expect(container.querySelectorAll('.lucide-folder-closed')).toHaveLength(2);

    await user.click(
      screen.getByRole('button', { name: 'Northstar mobile' }),
    );

    expect(container.querySelectorAll('.lucide-folder-open')).toHaveLength(3);
    expect(container.querySelectorAll('.lucide-folder-closed')).toHaveLength(1);
  });

  it('resizes by pointer and keyboard within the exported bounds', () => {
    const onWidthChange = vi.fn();
    render(<Sidebar nodes={nodes} onWidthChange={onWidthChange} />);

    const resizeHandle = screen.getByRole('separator', {
      name: 'Resize sidebar',
    });
    expect(resizeHandle).toHaveAttribute(
      'aria-valuenow',
      String(SIDEBAR_DEFAULT_WIDTH),
    );

    fireEvent.pointerDown(resizeHandle, {
      button: 0,
      clientX: SIDEBAR_DEFAULT_WIDTH,
      pointerId: 1,
    });
    fireEvent.pointerMove(resizeHandle, {
      clientX: SIDEBAR_DEFAULT_WIDTH + 100,
      pointerId: 1,
    });
    fireEvent.pointerUp(resizeHandle, {
      clientX: SIDEBAR_DEFAULT_WIDTH + 100,
      pointerId: 1,
    });
    expect(resizeHandle).toHaveAttribute(
      'aria-valuenow',
      String(SIDEBAR_DEFAULT_WIDTH + 100),
    );
    expect(onWidthChange).toHaveBeenLastCalledWith(
      SIDEBAR_DEFAULT_WIDTH + 100,
    );

    fireEvent.keyDown(resizeHandle, { key: 'End' });
    expect(resizeHandle).toHaveAttribute(
      'aria-valuenow',
      String(SIDEBAR_MAX_WIDTH),
    );
    fireEvent.keyDown(resizeHandle, { key: 'ArrowRight' });
    expect(resizeHandle).toHaveAttribute(
      'aria-valuenow',
      String(SIDEBAR_MAX_WIDTH),
    );
    fireEvent.keyDown(resizeHandle, { key: 'Home' });
    expect(resizeHandle).toHaveAttribute(
      'aria-valuenow',
      String(SIDEBAR_MIN_WIDTH),
    );
  });

  it('shows configurable empty messages for the root and open disclosures', () => {
    const { rerender } = render(
      <Sidebar emptyMessage="No navigation yet" nodes={[]} />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('No navigation yet');

    rerender(
      <Sidebar
        nodes={[
          {
            addAction: {
              'aria-label': 'Add project',
              href: '#new-project',
            },
            children: [],
            defaultOpen: true,
            emptyMessage: 'No projects yet',
            id: 'projects',
            label: 'Projects',
            listAction: {
              'aria-label': 'View all projects',
              href: '#projects',
            },
            type: 'node',
          },
        ]}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('No projects yet');
  });

  it('renders only the navigation actions supplied by each hierarchy level', async () => {
    const user = userEvent.setup();
    render(
      <Sidebar
        nodes={[
          {
            children: [
              {
                children: [
                  {
                    addAction: {
                      'aria-label': 'Add feature to Northstar',
                    },
                    children: [
                      {
                        children: [],
                        id: 'feature:FEAT-5831',
                        label: 'Authentication',
                        menuAction: {
                          'aria-label': 'Open Authentication menu',
                        },
                        pageAction: {
                          'aria-label': 'Go to Authentication',
                          href: '/projects/PRJ-204/features/FEAT-5831',
                        },
                        type: 'group',
                      },
                    ],
                    id: 'features',
                    label: 'Features',
                    type: 'node',
                  },
                ],
                id: 'project:PRJ-204',
                label: 'Northstar',
                menuAction: {
                  'aria-label': 'Open Northstar menu',
                },
                pageAction: {
                  'aria-label': 'Go to Northstar',
                  href: '/projects/PRJ-204',
                },
                type: 'group',
              },
            ],
            id: 'projects',
            label: 'Projects',
            listAction: {
              'aria-label': 'Go to Projects',
              href: '/',
            },
            type: 'node',
          },
        ]}
      />,
    );

    expect(screen.getByRole('link', { name: 'Go to Projects' })).toBeVisible();
    expect(
      screen.queryByRole('link', { name: 'Add project' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Northstar' }));

    expect(
      screen.getByRole('button', { name: 'Add feature to Northstar' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Open Northstar menu' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Go to Northstar' })).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Open Authentication menu' }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Go to Authentication' }),
    ).toBeVisible();
  });
});
