import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Breadcrumb, type BreadcrumbItems } from './Breadcrumb';

const items = [
  { href: '/organizations/northstar', label: 'Northstar Labs' },
  { href: '/projects/featurewise', label: 'Featurewise MVP' },
  { href: '/features/spec-generation', label: 'Spec generation' },
  { label: 'Context' },
] satisfies BreadcrumbItems;

describe('Breadcrumb', () => {
  it('renders linked ancestors and a non-interactive current page', () => {
    render(<Breadcrumb items={items} />);

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Northstar Labs' })).toHaveAttribute(
      'href',
      '/organizations/northstar',
    );
    expect(screen.getByRole('link', { name: 'Featurewise MVP' })).toHaveAttribute(
      'href',
      '/projects/featurewise',
    );
    expect(screen.getByText('Context')).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('link', { name: 'Context' })).not.toBeInTheDocument();
  });

  it('supports a custom accessible navigation name', () => {
    render(<Breadcrumb aria-label="Feature location" items={items} />);

    expect(
      screen.getByRole('navigation', { name: 'Feature location' }),
    ).toBeVisible();
  });

  it('opens the hidden-level menu and restores focus on Escape', async () => {
    const user = userEvent.setup();
    render(<Breadcrumb items={items} />);
    const trigger = screen.getByRole('button', { hidden: true });
    expect(trigger).toHaveAccessibleName('Show hidden breadcrumb levels');

    trigger.click();

    const menu = await screen.findByRole('menu', { hidden: true });
    expect(menu).toHaveAccessibleName('Hidden breadcrumb levels');
    const [project, feature] = screen.getAllByRole('menuitem', { hidden: true });
    await waitFor(() => expect(project).toHaveFocus());

    await user.keyboard('{ArrowDown}');
    expect(feature).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu', { hidden: true })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('renders a single current page without an overflow control', () => {
    render(<Breadcrumb items={[{ label: 'Organizations' }]} />);

    expect(screen.getByText('Organizations')).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
