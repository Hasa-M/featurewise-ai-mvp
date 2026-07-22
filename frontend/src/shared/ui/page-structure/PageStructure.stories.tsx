import type { Meta, StoryObj } from '@storybook/react-vite';
import { Building2, UserRound } from 'lucide-react';
import { expect } from 'storybook/test';

import { Button } from '../button';
import type { SidebarNodeItem } from '../sidebar';
import { PageStructure } from './PageStructure';

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
              'aria-label': 'Add feature to Northstar mobile',
              href: '#new-feature',
            },
            children: [
              {
                children: [
                  {
                    addAction: {
                      'aria-label': 'Generate authentication spec',
                      href: '#generate-spec',
                    },
                    children: [
                      {
                        href: '#generation-2',
                        id: 'generation-2',
                        label: 'Generation 2',
                        type: 'leaf',
                      },
                    ],
                    id: 'generations',
                    label: 'Generations',
                    listAction: {
                      'aria-label': 'View authentication generations',
                      href: '#generations',
                    },
                    type: 'node',
                  },
                ],
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
            ],
            id: 'features',
            label: 'Features',
            listAction: {
              'aria-label': 'View Northstar features',
              href: '#features',
            },
            type: 'node',
          },
        ],
        id: 'northstar',
        label: 'Northstar mobile',
        menuAction: {
          'aria-label': 'Open Northstar menu',
          onClick: () => undefined,
        },
        pageAction: {
          'aria-label': 'Open Northstar page',
          href: '#northstar',
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

const pagePlaceholder = (
  <section
    aria-labelledby="page-placeholder-title"
    style={{
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-card)',
      boxShadow: 'var(--shadow-sm)',
      display: 'grid',
      gap: 'var(--space-2)',
      padding: 'var(--space-6)',
    }}
  >
    <p className="fw-overline">Page structure</p>
    <h1 id="page-placeholder-title">Page content</h1>
    <p style={{ color: 'var(--text-muted)' }}>
      Title, actions, tabs, and body will render here.
    </p>
  </section>
);

const meta = {
  title: 'Global/PageStructure',
  component: PageStructure,
  args: {
    children: pagePlaceholder,
    headerProps: {
      dropdownCardProps: {
        children: (
          <div style={{ padding: 'var(--space-4)' }}>
            Organization settings
          </div>
        ),
        label: 'Northstar Labs',
        leadingVisual: (
          <Building2 aria-hidden="true" size={16} strokeWidth={1.75} />
        ),
        panelLabel: 'Organization settings',
      },
      homeHref: '#home',
      userControl: (
        <Button
          aria-label="Open user menu"
          isIcon
          size="small"
          variant="ghost"
        >
          <UserRound aria-hidden="true" size={17} strokeWidth={1.75} />
        </Button>
      ),
    },
    sidebarProps: {
      activeItemId: 'authentication',
      nodes,
    },
  },
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
} satisfies Meta<typeof PageStructure>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    const project = canvas.getByRole('button', {
      name: 'Northstar mobile',
    });
    await userEvent.click(project);
    await expect(project).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(
      canvas.getByRole('button', { name: 'Hide sidebar' }),
    );
    await expect(
      canvas.getByRole('button', { name: 'Show sidebar' }),
    ).toHaveAttribute('aria-expanded', 'false');
    await expect(
      canvas.getByRole('navigation', {
        hidden: true,
        name: 'Workspace navigation',
      }),
    ).not.toBeVisible();

    await userEvent.click(
      canvas.getByRole('button', { name: 'Show sidebar' }),
    );
    await expect(project).toBeVisible();
    await expect(project).toHaveAttribute('aria-expanded', 'true');
  },
};

export const SidebarHidden: Story = {
  args: {
    sidebarOpen: false,
  },
};
