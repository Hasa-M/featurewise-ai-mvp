import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Breadcrumb, type BreadcrumbItems } from './Breadcrumb';

const items = [
  { href: '/projects', kind: 'folder', label: 'Projects' },
  {
    href: '/projects/PRJ-204',
    kind: 'item',
    label: 'Northstar mobile',
  },
  {
    href: '/projects/PRJ-204',
    kind: 'folder',
    label: 'Features',
  },
  {
    href: '/projects/PRJ-204/features/FEAT-5831',
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
    ).toHaveAttribute('href', '/projects/PRJ-204');
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
      { href: '#resources', kind: 'folder', label: 'Resources' },
      { href: '#design-system', kind: 'item', label: 'Design system' },
      { href: '#components', kind: 'folder', label: 'Components' },
      { href: '#navigation', kind: 'item', label: 'Navigation' },
      {
        href: '#breadcrumb',
        kind: 'folder',
        label: 'Breadcrumb',
      },
      {
        href: '#examples',
        kind: 'item',
        label: 'Examples',
      },
    ] satisfies BreadcrumbItems;

    render(<Breadcrumb items={overflowItems} />);

    expect(
      screen.queryByRole('link', { name: 'Components' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Navigation' }),
    ).not.toBeInTheDocument();

    const trigger = screen.getByRole('button', {
      name: 'Show hidden breadcrumb levels',
    });
    await user.click(trigger);

    const menu = screen.getByRole('menu', {
      name: 'Hidden breadcrumb levels',
    });
    const components = screen.getByRole('menuitem', { name: 'Components' });
    const navigation = screen.getByRole('menuitem', {
      name: 'Navigation',
    });
    expect(menu).toBeVisible();
    await waitFor(() => expect(components).toHaveFocus());

    await user.keyboard('{ArrowDown}');
    expect(navigation).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
