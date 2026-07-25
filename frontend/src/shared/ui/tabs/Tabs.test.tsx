import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileText } from 'lucide-react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Tabs, type TabsItems } from './Tabs';

const items = [
  {
    icon: <FileText data-testid="overview-icon" />,
    id: 'overview',
    info: 3,
    label: 'Overview',
    panelId: 'overview-panel',
    tabId: 'overview-tab',
  },
  { id: 'context', label: 'Context artifacts' },
  { id: 'quality', label: 'Quality checks' },
  { id: 'history', label: 'Spec history' },
] satisfies TabsItems;

let tabListWidth = 1000;

function rect(width: number): DOMRect {
  return {
    bottom: 0,
    height: 0,
    left: 0,
    right: width,
    toJSON: () => ({}),
    top: 0,
    width,
    x: 0,
    y: 0,
  };
}

beforeEach(() => {
  tabListWidth = 1000;
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
    function (this: HTMLElement) {
      return this.hasAttribute('data-tabs-bar') ? tabListWidth : 0;
    },
  );
  vi.spyOn(
    HTMLElement.prototype,
    'getBoundingClientRect',
  ).mockImplementation(function (this: HTMLElement) {
    if (this.dataset.measureKind === 'tab') return rect(100);
    if (this.dataset.measureKind === 'more') return rect(70);
    return rect(0);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Tabs', () => {
  it('renders named tab semantics with optional icon, info, and panel link', () => {
    render(<Tabs aria-label="Feature workspace" items={items} />);

    const tabList = screen.getByRole('tablist', {
      name: 'Feature workspace',
    });
    const overview = within(tabList).getByRole('tab', { name: 'Overview' });

    expect(overview).toHaveAttribute('aria-selected', 'true');
    expect(overview).toHaveAttribute('aria-controls', 'overview-panel');
    expect(overview).toHaveAttribute('id', 'overview-tab');
    expect(within(overview).getByText('3')).toBeVisible();
    expect(within(overview).getByTestId('overview-icon')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('supports controlled selection without changing it internally', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Tabs
        aria-label="Feature workspace"
        items={items}
        onValueChange={onValueChange}
        value="overview"
      />,
    );

    await user.click(screen.getByRole('tab', { name: 'Context artifacts' }));

    expect(onValueChange).toHaveBeenCalledWith('context');
    expect(
      screen.getByRole('tab', { name: 'Overview' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('tab', { name: 'Context artifacts' }),
    ).toHaveAttribute('aria-selected', 'false');
  });

  it('moves and activates with arrow keys while skipping disabled tabs', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Tabs
        aria-label="Feature workspace"
        items={[
          items[0],
          { ...items[1], disabled: true },
          items[2],
        ]}
        onValueChange={onValueChange}
      />,
    );

    const overview = screen.getByRole('tab', { name: 'Overview' });
    const quality = screen.getByRole('tab', { name: 'Quality checks' });
    overview.focus();
    await user.keyboard('{ArrowRight}');

    expect(quality).toHaveFocus();
    expect(quality).toHaveAttribute('aria-selected', 'true');
    expect(onValueChange).toHaveBeenCalledWith('quality');
  });

  it('shows hidden tabs in More and swaps the chosen tab with the rightmost visible tab', async () => {
    tabListWidth = 290;
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Tabs
        aria-label="Feature workspace"
        items={items}
        onValueChange={onValueChange}
      />,
    );

    const more = await screen.findByRole('button', { name: 'More tabs' });
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(
      screen.getByRole('tab', { name: 'Context artifacts' }),
    ).toBeVisible();

    await user.click(more);
    const qualityMenuItem = screen.getByRole('menuitem', {
      name: 'Quality checks',
    });
    await waitFor(() => expect(qualityMenuItem).toHaveFocus());
    await user.click(qualityMenuItem);

    const qualityTab = await screen.findByRole('tab', {
      name: 'Quality checks',
    });
    await waitFor(() => expect(qualityTab).toHaveFocus());
    expect(qualityTab).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.queryByRole('tab', { name: 'Context artifacts' }),
    ).not.toBeInTheDocument();
    expect(onValueChange).toHaveBeenCalledWith('quality');

    await user.click(more);
    expect(
      screen.getByRole('menuitem', { name: 'Context artifacts' }),
    ).toBeVisible();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(more).toHaveFocus();
  });

  it('does not show More while every tab fits', async () => {
    render(<Tabs aria-label="Feature workspace" items={items} />);

    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'More tabs' }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getAllByRole('tab')).toHaveLength(items.length);
  });
});
