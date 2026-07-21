import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileText, List, MoreVertical, Plus } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { Accordion } from './Accordion';

describe('Accordion', () => {
  it('toggles its labelled region and reports open state changes', async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Accordion label="Recents" onOpenChange={onOpenChange}>
        <a href="#feature">Backend CRUD API map</a>
      </Accordion>,
    );

    const trigger = screen.getByRole('button', { name: 'Recents' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: 'Recents' })).not.toBeInTheDocument();

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Recents' })).toBeVisible();
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('supports controlled disclosure state', async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <Accordion label="Context artifacts" onOpenChange={onOpenChange} open={false}>
        <span>Customer notes</span>
      </Accordion>,
    );

    const trigger = screen.getByRole('button', { name: 'Context artifacts' });
    await user.click(trigger);

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    rerender(
      <Accordion label="Context artifacts" onOpenChange={onOpenChange} open>
        <span>Customer notes</span>
      </Accordion>,
    );
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('keeps nested disclosure states independent', async () => {
    const user = userEvent.setup();
    render(
      <Accordion defaultOpen label="Projects">
        <Accordion label="Northstar">
          <span>Project content</span>
        </Accordion>
      </Accordion>,
    );

    const projects = screen.getByRole('button', { name: 'Projects' });
    const northstar = screen.getByRole('button', { name: 'Northstar' });
    expect(projects).toHaveAttribute('aria-expanded', 'true');
    expect(northstar).toHaveAttribute('aria-expanded', 'false');

    await user.click(northstar);
    expect(projects).toHaveAttribute('aria-expanded', 'true');
    expect(northstar).toHaveAttribute('aria-expanded', 'true');
  });

  it('keeps a navigation action separate from the full label trigger', async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Accordion
        actions={[
          {
            'aria-label': 'View all recent features',
            href: '#all-recents',
            icon: <List />,
          },
        ]}
        label="Recents"
        onOpenChange={onOpenChange}
        selection="current"
      >
        <span>Feature list</span>
      </Accordion>,
    );

    const action = screen.getByRole('link', {
      name: 'View all recent features',
    });
    const trigger = screen.getByRole('button', { name: 'Recents' });

    await user.click(action);
    expect(action).toHaveAttribute('href', '#all-recents');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(trigger.closest('[data-selection]')).toHaveAttribute(
      'data-selection',
      'current',
    );

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('runs ordered hover and always-visible actions without toggling', async () => {
    const onMenu = vi.fn();
    const onList = vi.fn();
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(
      <Accordion
        actions={[
          {
            'aria-label': 'Open recent feature menu',
            icon: <MoreVertical />,
            onClick: onMenu,
            visibility: 'hover',
          },
          {
            'aria-label': 'View all recent features',
            icon: <List />,
            onClick: onList,
          },
          {
            'aria-label': 'Add recent feature',
            icon: <Plus />,
            onClick: onAdd,
          },
        ]}
        label="Recents"
      >
        <span>Feature list</span>
      </Accordion>,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveAccessibleName('Recents');
    expect(buttons[1]).toHaveAccessibleName('Open recent feature menu');
    expect(buttons[2]).toHaveAccessibleName('View all recent features');
    expect(buttons[3]).toHaveAccessibleName('Add recent feature');

    await user.click(
      screen.getByRole('button', { name: 'Open recent feature menu' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'View all recent features' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Add recent feature' }),
    );

    expect(onMenu).toHaveBeenCalledOnce();
    expect(onList).toHaveBeenCalledOnce();
    expect(onAdd).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Recents' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('keeps leading and action icons out of accessible names', () => {
    render(
      <Accordion
        actions={[
          {
            'aria-label': 'View all features',
            icon: <List aria-label="List icon" />,
          },
        ]}
        label="Features"
        leadingIcon={<FileText aria-label="File icon" />}
      >
        <span>Feature list</span>
      </Accordion>,
    );

    expect(screen.getByRole('button', { name: 'Features' })).toHaveAccessibleName(
      'Features',
    );
    expect(
      screen.getByRole('button', { name: 'View all features' }),
    ).toHaveAttribute('title', 'View all features');
  });

  it('prevents disclosure and action interaction when disabled', async () => {
    const onMenu = vi.fn();
    const onList = vi.fn();
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Accordion
        actions={[
          {
            'aria-label': 'Open recent feature menu',
            icon: <MoreVertical />,
            onClick: onMenu,
            visibility: 'hover',
          },
          {
            'aria-label': 'View all recent features',
            icon: <List />,
            onClick: onList,
          },
        ]}
        disabled
        label="Recents"
        onOpenChange={onOpenChange}
      >
        <span>Feature list</span>
      </Accordion>,
    );

    await user.click(screen.getByRole('button', { name: 'Recents' }));
    await user.click(
      screen.getByRole('button', { name: 'Open recent feature menu' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'View all recent features' }),
    );

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onMenu).not.toHaveBeenCalled();
    expect(onList).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Recents' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
