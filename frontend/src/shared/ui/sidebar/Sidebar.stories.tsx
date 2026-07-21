import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';

import {
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  Sidebar,
} from './Sidebar';
import type { SidebarNodeItem } from './Sidebar';

function createNodes({
  authenticationOpen = false,
  projectsOpen,
}: {
  authenticationOpen?: boolean;
  projectsOpen?: boolean;
} = {}): readonly SidebarNodeItem[] {
  return [
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
                  children: [
                    {
                      addAction: {
                        'aria-label': 'Generate authentication spec',
                        href: '#generate-authentication',
                      },
                      children: [
                        {
                          href: '#authentication-v2',
                          id: 'authentication-v2',
                          label: 'Generation 2',
                          type: 'leaf',
                        },
                        {
                          href: '#authentication-v1',
                          id: 'authentication-v1',
                          label: 'Generation 1',
                          type: 'leaf',
                        },
                      ],
                      id: 'authentication-generations',
                      label: 'Generations',
                      listAction: {
                        'aria-label': 'View authentication generations',
                        href: '#authentication-generations',
                      },
                      type: 'node',
                    },
                  ],
                  defaultOpen: authenticationOpen,
                  id: 'authentication',
                  label: 'Authentication workflow',
                  menuAction: {
                    'aria-label': 'Open authentication menu',
                    onClick: () => undefined,
                  },
                  pageAction: {
                    'aria-label': 'Open authentication page',
                    href: '#authentication',
                  },
                  type: 'group',
                },
                {
                  children: [
                    {
                      addAction: {
                        'aria-label': 'Generate offline sync spec',
                        href: '#generate-offline-sync',
                      },
                      children: [],
                      emptyMessage: 'No generations yet',
                      id: 'offline-sync-generations',
                      label: 'Generations',
                      listAction: {
                        'aria-label': 'View offline sync generations',
                        href: '#offline-sync-generations',
                      },
                      type: 'node',
                    },
                  ],
                  id: 'offline-sync',
                  label: 'Offline sync',
                  menuAction: {
                    'aria-label': 'Open offline sync menu',
                    onClick: () => undefined,
                  },
                  pageAction: {
                    'aria-label': 'Open offline sync page',
                    href: '#offline-sync',
                  },
                  type: 'group',
                },
              ],
              id: 'northstar-features',
              label: 'Features',
              listAction: {
                'aria-label': 'View Northstar features',
                href: '#northstar-features',
              },
              type: 'node',
            },
          ],
          defaultOpen: true,
          id: 'northstar-mobile',
          label: 'Northstar mobile',
          menuAction: {
            'aria-label': 'Open Northstar menu',
            onClick: () => undefined,
          },
          pageAction: {
            'aria-label': 'Open Northstar page',
            href: '#northstar-mobile',
          },
          type: 'group',
        },
        {
          children: [
            {
              addAction: {
                'aria-label': 'Add feature to Featurewise MVP',
                href: '#new-featurewise-feature',
              },
              children: [],
              id: 'featurewise-features',
              label: 'Features',
              listAction: {
                'aria-label': 'View Featurewise MVP features',
                href: '#featurewise-features',
              },
              type: 'node',
            },
          ],
          id: 'featurewise-mvp',
          label: 'Featurewise MVP',
          menuAction: {
            'aria-label': 'Open Featurewise MVP menu',
            onClick: () => undefined,
          },
          pageAction: {
            'aria-label': 'Open Featurewise MVP page',
            href: '#featurewise-mvp',
          },
          type: 'group',
        },
      ],
      defaultOpen: projectsOpen,
      id: 'projects',
      label: 'Projects',
      listAction: {
        'aria-label': 'View all projects',
        href: '#projects',
      },
      type: 'node',
    },
  ];
}

const meta = {
  title: 'Global/Sidebar',
  component: Sidebar,
  args: {
    nodes: createNodes(),
  },
  decorators: [
    (Story) => (
      <div style={{ height: '42rem', maxWidth: '100vw' }}>
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(
      canvas.getByRole('navigation', { name: 'Workspace navigation' }),
    ).toBeVisible();
    const projects = canvas.getByRole('button', { name: 'Projects' });
    const projectsIndicator = projects.querySelector('.lucide-chevron-right');
    await expect(projectsIndicator).not.toBeNull();
    await waitFor(() =>
      expect(projectsIndicator as Element).not.toBeVisible(),
    );
    await expect(
      canvas.getByRole('link', { name: 'View all projects' }),
    ).not.toBeVisible();
    await expect(
      canvas.getByRole('link', { name: 'Add project' }),
    ).toBeVisible();
    projects.focus();
    await waitFor(() =>
      expect(
        canvas.getByRole('link', { name: 'View all projects' }),
      ).toBeVisible(),
    );
    const authentication = canvas.getByRole('button', {
      name: 'Authentication workflow',
    });
    const indicator = authentication.querySelector('.lucide-chevron-right');
    await expect(authentication).toHaveAttribute('aria-expanded', 'false');
    await expect(indicator).not.toBeNull();
    await expect(indicator as Element).toBeVisible();
    await expect(getComputedStyle(indicator as Element).transform).toBe('none');

    authentication.focus();
    await userEvent.keyboard('{Enter}');
    await expect(authentication).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() =>
      expect(getComputedStyle(indicator as Element).transform).not.toBe('none'),
    );
    await expect(
      canvas.getByRole('link', { name: 'Generation 2' }),
    ).toBeVisible();

    const project = canvas.getByRole('button', {
      name: 'Northstar mobile',
    });
    project.focus();
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: 'Open Northstar menu' }),
      ).toBeVisible(),
    );
  },
};

export const SelectedGeneration: Story = {
  args: {
    activeItemId: 'authentication-v2',
    nodes: createNodes({ authenticationOpen: true }),
  },
};

export const SelectedAccordion: Story = {
  args: {
    activeItemId: 'authentication',
    nodes: createNodes({ authenticationOpen: true }),
  },
  play: async ({ canvas }) => {
    await expect(
      canvas
        .getByRole('button', { name: 'Authentication workflow' })
        .closest('[data-selection]'),
    ).toHaveAttribute('data-selection', 'current');
    await expect(
      canvas
        .getByRole('button', { name: 'Projects' })
        .closest('[data-selection]'),
    ).toHaveAttribute('data-selection', 'ancestor');
  },
};

export const Resizable: Story = {
  args: {
    defaultWidth: 320,
  },
  play: async ({ canvas, userEvent }) => {
    const resizeHandle = canvas.getByRole('separator', {
      name: 'Resize sidebar',
    });
    await expect(resizeHandle).toHaveAttribute('aria-valuenow', '320');

    await userEvent.pointer([
      {
        coords: { clientX: 320, clientY: 240 },
        keys: '[MouseLeft>]',
        target: resizeHandle,
      },
      {
        coords: { clientX: 440, clientY: 240 },
        target: resizeHandle,
      },
      {
        coords: { clientX: 440, clientY: 240 },
        keys: '[/MouseLeft]',
        target: resizeHandle,
      },
    ]);
    await expect(resizeHandle).toHaveAttribute('aria-valuenow', '440');

    resizeHandle.focus();
    await userEvent.keyboard('{End}');
    await expect(resizeHandle).toHaveAttribute(
      'aria-valuenow',
      String(SIDEBAR_MAX_WIDTH),
    );
  },
};

export const MinimumWidth: Story = {
  args: { defaultWidth: SIDEBAR_MIN_WIDTH },
};

export const MaximumWidth: Story = {
  args: { defaultWidth: SIDEBAR_MAX_WIDTH },
};

export const Collapsed: Story = {
  args: { nodes: createNodes({ projectsOpen: false }) },
};

export const Empty: Story = {
  args: {
    emptyMessage: 'No navigation yet. Add a project to get started.',
    nodes: [],
  },
};
