import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Breadcrumb, type BreadcrumbItems } from './Breadcrumb';

const items = [
  { href: '/projects', kind: 'folder', label: 'Projects' },
  {
    href: '/projects/northstar-mobile',
    kind: 'item',
    label: 'Northstar mobile',
  },
  {
    href: '/projects/northstar-mobile',
    kind: 'folder',
    label: 'Features',
  },
  {
    href: '/projects/northstar-mobile/features/authentication',
    kind: 'item',
    label: 'Authentication workflow',
  },
] satisfies BreadcrumbItems;

describe('Breadcrumb', () => {
  it('renders every ancestor as a link and the current page as the level-one heading', () => {
    const { container } = render(
      <Breadcrumb items={items} titleId={'feature-title'} />,
    );

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'href',
      '/projects',
    );
    expect(
      screen.getByRole('link', { name: 'Northstar mobile' }),
    ).toHaveAttribute('href', '/projects/northstar-mobile');
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Authentication workflow',
      }),
    ).toBeVisible();
    expect(screen.getByRole('heading')).toHaveAttribute('id', 'feature-title');
    expect(
      screen.getByRole('link', { name: 'Authentication workflow' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(container.querySelectorAll('.lucide-chevron-right')).toHaveLength(1);
  });

  it('moves middle pairs into a keyboard-accessible menu after four levels', async () => {
    const user = userEvent.setup();
    const overflowItems = [
      items[0],
      items[1],
      items[2],
      items[3],
      {
        href: '/projects/northstar-mobile/features/authentication/generations',
        kind: 'folder',
        label: 'Generations',
      },
      {
        href: '/projects/northstar-mobile/features/authentication/generations/2',
        kind: 'item',
        label: 'Generation 2',
      },
    ] satisfies BreadcrumbItems;

    render(<Breadcrumb items={overflowItems} />);

    expect(
      screen.queryByRole('link', { name: 'Features' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Authentication workflow' }),
    ).not.toBeInTheDocument();

    const trigger = screen.getByRole('button', {
      name: 'Show hidden breadcrumb levels',
    });
    await user.click(trigger);

    const menu = screen.getByRole('menu', {
      name: 'Hidden breadcrumb levels',
    });
    const features = screen.getByRole('menuitem', { name: 'Features' });
    const authentication = screen.getByRole('menuitem', {
      name: 'Authentication workflow',
    });
    expect(menu).toBeVisible();
    await waitFor(() => expect(features).toHaveFocus());

    await user.keyboard('{ArrowDown}');
    expect(authentication).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
