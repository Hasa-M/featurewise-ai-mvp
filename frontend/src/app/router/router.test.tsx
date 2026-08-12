import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createMemoryRouter,
  parsePath,
  RouterProvider,
} from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppQueryClient } from '@/app/query/query-client';
import { AuthProvider } from '@/features/auth';

import { routes } from './router';

const currentUser = {
  organizationKey: 'ORG-12',
  projectKey: 'PRJ-204',
  userKey: 'USR-7',
  username: 'marco',
};

const legacyProjectUuid = '22222222-2222-4222-8222-222222222222';
const legacyFeatureUuid = '44444444-4444-4444-8444-444444444444';

const organization = {
  createdAt: '2026-07-18T10:00:00.000Z',
  name: 'Northstar Labs',
  publicKey: currentUser.organizationKey,
  updatedAt: '2026-07-18T10:00:00.000Z',
};

const project = {
  createdAt: '2026-07-18T10:00:00.000Z',
  featureCount: 1,
  name: 'Northstar mobile',
  organizationKey: currentUser.organizationKey,
  publicKey: currentUser.projectKey,
  updatedAt: '2026-07-18T10:00:00.000Z',
};

const feature = {
  activity: {
    currentValidSpecVersion: 2,
    generationRunCount: 3,
    latestFeatureRun: {
      runKind: 'generation',
      status: 'completed',
      usedProjectContext: true,
    },
  },
  alignment: { pendingUpdates: [], status: 'aligned' },
  brief: null,
  createdAt: '2026-07-18T10:00:00.000Z',
  createdByKey: currentUser.userKey,
  includeInProjectContext: false,
  origin: 'brand_new',
  projectKey: project.publicKey,
  publicKey: 'FEAT-5831',
  title: 'Authentication workflow',
  updatedAt: '2026-07-18T10:00:00.000Z',
};

const includedFeature = {
  ...feature,
  activity: {
    currentValidSpecVersion: null,
    generationRunCount: 0,
    latestFeatureRun: null,
  },
  includeInProjectContext: true,
  origin: 'mapped_existing',
  publicKey: 'FEAT-5832',
  title: 'Billing controls',
};

const featureContext = {
  createdAt: '2026-07-18T10:00:00.000Z',
  featureKey: feature.publicKey,
  featureUpdateKey: null,
  files: [],
  promptContent: '',
  publicKey: 'CTX-19',
  updatedAt: '2026-07-18T10:00:00.000Z',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

function requestPath(input: RequestInfo | URL) {
  return typeof input === 'string' ? input : input.toString();
}

function defaultFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const path = requestPath(input);

  if (path === '/api/auth/login') {
    return Promise.resolve(
      jsonResponse({
        accessToken: 'access-token',
        expiresInSeconds: 43_200,
        tokenType: 'Bearer',
        user: currentUser,
      }),
    );
  }
  if (path === '/api/auth/me') return Promise.resolve(jsonResponse(currentUser));
  if (path === `/api/organizations/${organization.publicKey}`) {
    if (init?.method === 'PATCH') {
      return Promise.resolve(
        jsonResponse({ ...organization, name: 'Renamed workspace' }),
      );
    }
    return Promise.resolve(jsonResponse(organization));
  }
  if (path === `/api/organizations/${organization.publicKey}/projects`) {
    return Promise.resolve(jsonResponse([project]));
  }
  if (path === `/api/projects/${project.publicKey}` && init?.method === 'PATCH') {
    return Promise.resolve(
      jsonResponse({ ...project, name: 'Renamed project' }),
    );
  }
  if (path === `/api/projects/${project.publicKey}`) {
    return Promise.resolve(jsonResponse(project));
  }
  if (path === `/api/projects/${project.publicKey}/features`) {
    return Promise.resolve(jsonResponse([feature]));
  }
  if (
    path ===
    `/api/projects/${project.publicKey}/features/${feature.publicKey}`
  ) {
    return Promise.resolve(jsonResponse(feature));
  }
  if (path === `/api/features/${feature.publicKey}`) {
    return Promise.resolve(jsonResponse(feature));
  }
  if (path === `/api/features/${feature.publicKey}/context`) {
    return Promise.resolve(jsonResponse(featureContext));
  }
  if (
    path === `/api/projects/${legacyProjectUuid}` ||
    path ===
      `/api/projects/${legacyProjectUuid}/features/${legacyFeatureUuid}`
  ) {
    return Promise.resolve(jsonResponse({ message: 'Invalid public key' }, 400));
  }

  return Promise.resolve(jsonResponse({ message: 'Not found' }, 404));
}

function renderRoute(path: string, state?: unknown) {
  const initialEntry =
    state === undefined ? path : { ...parsePath(path), state };
  const testRouter = createMemoryRouter(routes, {
    initialEntries: [initialEntry],
  });
  const queryClient = createAppQueryClient();

  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={testRouter} />
      </AuthProvider>
    </QueryClientProvider>,
  );

  return { queryClient, testRouter };
}

describe('application routes', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal('fetch', vi.fn(defaultFetch));
  });

  it('redirects an anonymous user to login', async () => {
    renderRoute('/');

    expect(
      await screen.findByRole('heading', { name: 'Sign in' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toHaveFocus();
  });

  it('enables submit only while the form values are valid', async () => {
    const user = userEvent.setup();
    renderRoute('/login');

    const username = screen.getByLabelText('Username');
    const password = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });

    expect(submitButton).toBeDisabled();
    await user.type(username, 'marco');
    await user.type(password, 'correct-password');
    expect(submitButton).toBeEnabled();
    await user.clear(username);
    expect(submitButton).toBeDisabled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('signs in, renders Projects, clears cached data, and logs out', async () => {
    const user = userEvent.setup();
    const { queryClient } = renderRoute('/login');

    await user.type(screen.getByLabelText('Username'), 'marco');
    await user.type(screen.getByLabelText('Password'), 'correct-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('heading', { name: 'Projects' }),
    ).toBeVisible();
    expect(window.localStorage.getItem('featurewise.accessToken')).toBe(
      'access-token',
    );
    queryClient.setQueryData(['private-test-data'], 'secret');

    await user.click(screen.getByRole('button', { name: 'Open user menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Log out' }));

    expect(
      await screen.findByRole('heading', { name: 'Sign in' }),
    ).toBeVisible();
    expect(queryClient.getQueryData(['private-test-data'])).toBeUndefined();
    expect(window.localStorage.getItem('featurewise.accessToken')).toBeNull();
  });

  it('shows invalid credential feedback from the backend', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ message: 'Invalid username or password' }, 401),
      ),
    );
    const user = userEvent.setup();
    renderRoute('/login');

    await user.type(screen.getByLabelText('Username'), 'marco');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid username or password.',
    );
  });

  it('restores a session and updates the organization from the header dropdown', async () => {
    window.localStorage.setItem('featurewise.accessToken', 'stored-token');
    const user = userEvent.setup();
    renderRoute('/');

    await user.click(
      await screen.findByRole('button', { name: 'Northstar Labs' }),
    );
    const input = screen.getByLabelText('Organization name');
    await user.clear(input);
    await user.type(input, 'Renamed workspace');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(
      await screen.findByRole('button', { name: 'Renamed workspace' }),
    ).toBeVisible();
  });

  it('renders a clickable project card with its feature count and edit menu', async () => {
    window.localStorage.setItem('featurewise.accessToken', 'stored-token');
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    const { testRouter } = renderRoute('/');

    const projectLink = await screen.findByRole('link', {
      name: project.name,
    });
    expect(
      screen.getByRole('heading', { level: 2, name: project.name }),
    ).toBeVisible();
    expect(projectLink).toHaveAccessibleDescription('1 feature');
    expect(
      fetchMock.mock.calls.some(
        ([input]) =>
          requestPath(input) ===
          `/api/projects/${project.publicKey}/features`,
      ),
    ).toBe(false);

    await user.click(
      screen.getByRole('button', {
        name: `Open ${project.name} project menu`,
      }),
    );
    await user.click(screen.getByRole('menuitem', { name: 'Edit project' }));
    const input = screen.getByLabelText('Project name');
    await user.clear(input);
    await user.type(input, 'Renamed project');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    const renamedLink = await screen.findByRole('link', {
      name: 'Renamed project',
    });
    expect(renamedLink).toHaveAccessibleDescription('1 feature');
    await user.click(renamedLink);
    await waitFor(() => {
      expect(testRouter.state.location.pathname).toBe(
        `/projects/${project.publicKey}`,
      );
    });
  });

  it('prefetches once and navigates through project and feature pages without reloading', async () => {
    window.localStorage.setItem('featurewise.accessToken', 'stored-token');
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    const { testRouter } = renderRoute('/');

    const projectLink = await screen.findByRole('link', {
      name: 'Northstar mobile',
    });
    await user.hover(projectLink);
    await user.click(projectLink);

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Northstar mobile',
      }),
    ).toBeVisible();
    expect(
      screen.getByRole('navigation', { name: 'Breadcrumb' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'href',
      '/',
    );
    await user.click(
      await screen.findByRole('link', { name: 'Authentication workflow' }),
    );
    await waitFor(() => {
      expect(testRouter.state.location.pathname).toBe(
        `/projects/${project.publicKey}/features/${feature.publicKey}`,
      );
    });
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Authentication workflow',
      }),
    ).toBeVisible();
    await waitFor(() => {
      expect(testRouter.state.location.search).toBe('?tab=context');
    });
    expect(
      fetchMock.mock.calls.filter(
        ([input]) =>
          requestPath(input) ===
          `/api/projects/${project.publicKey}/features`,
      ),
    ).toHaveLength(1);
    expect(
      fetchMock.mock.calls.some(
        ([input]) =>
          requestPath(input) === `/api/projects/${project.publicKey}`,
      ),
    ).toBe(false);
    expect(
      fetchMock.mock.calls.some(
        ([input]) =>
          requestPath(input) ===
          `/api/projects/${project.publicKey}/features/${feature.publicKey}`,
      ),
    ).toBe(false);

    await user.click(
      screen.getByRole('link', { name: 'Northstar mobile' }),
    );
    expect(testRouter.state.location.pathname).toBe(
      `/projects/${project.publicKey}`,
    );
  });

  it('renders feature cards with distinct readiness, membership, and run information', async () => {
    window.localStorage.setItem('featurewise.accessToken', 'stored-token');
    renderRoute(`/projects/${project.publicKey}`);

    expect(
      await screen.findByRole('heading', { name: feature.title }),
    ).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Features' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByText('Brand new')).toBeVisible();
    expect(screen.getByText('Aligned')).toBeVisible();
    expect(screen.getByText('Not in project context')).toBeVisible();
    expect(screen.getByText('3 generations')).toBeVisible();
    expect(screen.getByText('Version 2')).toBeVisible();
    expect(screen.getByText('Generation · Completed')).toBeVisible();
    expect(
      screen.getByText('Project context used in latest run'),
    ).toBeVisible();
  });

  it('normalizes an invalid project tab while preserving other query parameters', async () => {
    window.localStorage.setItem('featurewise.accessToken', 'stored-token');
    const { testRouter } = renderRoute(
      `/projects/${project.publicKey}?tab=unknown&view=compact`,
    );

    expect(
      await screen.findByRole('heading', { name: feature.title }),
    ).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Features' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await waitFor(() => {
      expect(testRouter.state.location.search).toBe(
        '?tab=features&view=compact',
      );
    });
  });

  it('persists changed project-context membership and exposes select-all indeterminacy', async () => {
    window.localStorage.setItem('featurewise.accessToken', 'stored-token');
    const fetchMock = vi.fn(
      (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const path = requestPath(input);

        if (path === `/api/projects/${project.publicKey}/features`) {
          return Promise.resolve(jsonResponse([feature, includedFeature]));
        }
        if (
          path === `/api/features/${feature.publicKey}` &&
          init?.method === 'PATCH'
        ) {
          const body = JSON.parse(String(init.body)) as Record<string, unknown>;
          return Promise.resolve(jsonResponse({ ...feature, ...body }));
        }

        return defaultFetch(input, init);
      },
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderRoute(`/projects/${project.publicKey}?tab=context`);

    const selectAll = await screen.findByRole('checkbox', {
      name: 'Select all features',
    });
    const authentication = screen.getByRole('checkbox', {
      name: feature.title,
    });
    const save = screen.getByRole('button', { name: 'Save selection' });

    expect(selectAll).toBePartiallyChecked();
    expect(save).toBeDisabled();
    await user.click(authentication);
    expect(selectAll).toBeChecked();
    expect(save).toBeEnabled();
    await user.click(save);

    expect(
      await screen.findByText('Project context membership saved.'),
    ).toBeVisible();
    expect(save).toBeDisabled();
    const membershipRequests = fetchMock.mock.calls.filter(
      ([input, init]) =>
        requestPath(input) === `/api/features/${feature.publicKey}` &&
        init?.method === 'PATCH',
    );
    expect(membershipRequests).toHaveLength(1);
    expect(JSON.parse(String(membershipRequests[0]?.[1]?.body))).toEqual({
      includeInProjectContext: true,
    });
  });

  it('keeps failed project-context changes dirty after partial save', async () => {
    window.localStorage.setItem('featurewise.accessToken', 'stored-token');
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
          const path = requestPath(input);

          if (path === `/api/projects/${project.publicKey}/features`) {
            return Promise.resolve(jsonResponse([feature, includedFeature]));
          }
          if (
            path === `/api/features/${feature.publicKey}` &&
            init?.method === 'PATCH'
          ) {
            const body = JSON.parse(String(init.body)) as Record<
              string,
              unknown
            >;
            return Promise.resolve(jsonResponse({ ...feature, ...body }));
          }
          if (
            path === `/api/features/${includedFeature.publicKey}` &&
            init?.method === 'PATCH'
          ) {
            return Promise.resolve(
              jsonResponse({ message: 'Membership update failed' }, 500),
            );
          }

          return defaultFetch(input, init);
        },
      ),
    );
    const user = userEvent.setup();
    renderRoute(`/projects/${project.publicKey}?tab=context`);

    await user.click(
      await screen.findByRole('checkbox', { name: feature.title }),
    );
    await user.click(
      screen.getByRole('checkbox', { name: includedFeature.title }),
    );
    const save = screen.getByRole('button', { name: 'Save selection' });
    await user.click(save);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Membership update failed',
    );
    expect(save).toBeEnabled();
    expect(
      screen.getByRole('checkbox', { name: feature.title }),
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: includedFeature.title }),
    ).not.toBeChecked();
  });

  it('normalizes an invalid feature tab while preserving other query parameters', async () => {
    window.localStorage.setItem('featurewise.accessToken', 'stored-token');
    const { testRouter } = renderRoute(
      `/projects/${project.publicKey}/features/${feature.publicKey}?tab=unknown&view=compact`,
    );

    expect(
      await screen.findByRole('heading', { name: feature.title }),
    ).toBeVisible();
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(screen.getByRole('tab', { name: 'Context' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      await screen.findByRole('heading', { name: 'Feature intent' }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', {
        name: 'Project and implementation context',
      }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Selected model inputs' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Files archive' }),
    ).toBeVisible();
    await waitFor(() => {
      expect(testRouter.state.location.search).toBe(
        '?tab=context&view=compact',
      );
    });
  });

  it('rejects a legacy UUID feature URL without canonicalizing it', async () => {
    window.localStorage.setItem('featurewise.accessToken', 'stored-token');
    const navigationState = { from: 'shared-link' };
    const { testRouter } = renderRoute(
      `/projects/${legacyProjectUuid}/features/${legacyFeatureUuid}?tab=context&view=compact`,
      navigationState,
    );

    expect(
      await screen.findByText(
        'This feature does not exist in the selected project.',
      ),
    ).toBeVisible();
    expect(testRouter.state.location.pathname).toBe(
      `/projects/${legacyProjectUuid}/features/${legacyFeatureUuid}`,
    );
    expect(testRouter.state.location.search).toBe(
      '?tab=context&view=compact',
    );
    expect(testRouter.state.location.state).toEqual(navigationState);
  });

  it('deep-links and navigates feature tabs through browser history without refetching', async () => {
    window.localStorage.setItem('featurewise.accessToken', 'stored-token');
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    const { testRouter } = renderRoute(
      `/projects/${project.publicKey}/features/${feature.publicKey}?tab=generations&view=compact`,
    );

    expect(
      await screen.findByText(
        'Generation history and controls will be added in a later milestone.',
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        'Manage feature context, generations, updates, and specifications.',
      ),
    ).toBeVisible();
    const generationsTab = screen.getByRole('tab', { name: 'Generations' });
    const generationsPanel = screen.getByRole('tabpanel');
    expect(generationsTab).toHaveAttribute('aria-selected', 'true');
    expect(generationsTab).toHaveAttribute(
      'aria-controls',
      'feature-generations-panel',
    );
    expect(generationsPanel).toHaveAttribute(
      'aria-labelledby',
      'feature-generations-tab',
    );

    const featureRequestsBeforeSwitch = fetchMock.mock.calls.filter(
      ([input]) =>
        requestPath(input) ===
        `/api/projects/${project.publicKey}/features/${feature.publicKey}`,
    ).length;
    await user.click(screen.getByRole('tab', { name: 'Updates' }));

    await waitFor(() => {
      expect(testRouter.state.location.search).toBe(
        '?tab=updates&view=compact',
      );
    });
    expect(screen.getByRole('tabpanel')).toHaveTextContent(
      'Feature updates will be added in a later milestone.',
    );
    expect(
      fetchMock.mock.calls.filter(
        ([input]) =>
          requestPath(input) ===
          `/api/projects/${project.publicKey}/features/${feature.publicKey}`,
      ),
    ).toHaveLength(featureRequestsBeforeSwitch);

    await testRouter.navigate(-1);
    await waitFor(() => {
      expect(testRouter.state.location.search).toBe(
        '?tab=generations&view=compact',
      );
      expect(generationsTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('keeps expanded navigation mounted and exposes shared entity actions', async () => {
    window.localStorage.setItem('featurewise.accessToken', 'stored-token');
    const user = userEvent.setup();
    const { testRouter } = renderRoute('/');

    const projectDisclosure = await screen.findByRole('button', {
      name: 'Northstar mobile',
    });
    await user.click(projectDisclosure);
    expect(projectDisclosure).toHaveAttribute('aria-expanded', 'true');

    expect(
      await screen.findByRole('button', {
        name: 'Add feature to Northstar mobile',
      }),
    ).toBeVisible();
    const projectMenu = screen.getByRole('button', {
      name: 'Open Northstar mobile menu',
    });
    await user.click(projectMenu);
    await user.click(screen.getByRole('menuitem', { name: 'Edit project' }));
    expect(screen.getByRole('dialog', { name: 'Edit project' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(testRouter.state.location.pathname).toBe('/');

    await user.click(
      screen.getByRole('link', { name: 'Go to Northstar mobile' }),
    );
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Northstar mobile',
      }),
    ).toBeVisible();
    expect(projectDisclosure).toHaveAttribute('aria-expanded', 'true');
    expect(
      await screen.findByRole('button', {
        name: 'Open Authentication workflow menu',
      }),
    ).toBeVisible();
  });

  it('keeps feature quick edit bounded and creation origin explicit', async () => {
    window.localStorage.setItem('featurewise.accessToken', 'stored-token');
    const user = userEvent.setup();
    renderRoute(
      `/projects/${project.publicKey}/features/${feature.publicKey}`,
    );

    await user.click(
      await screen.findByRole('button', { name: 'Edit feature' }),
    );
    expect(screen.getByRole('dialog', { name: 'Edit feature' })).toBeVisible();
    expect(screen.getByLabelText('Feature title')).toBeVisible();
    expect(screen.getByLabelText('Feature brief')).toBeVisible();
    expect(screen.getByLabelText('Include in project context')).toBeVisible();
    expect(screen.queryByText('Feature origin')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await user.click(screen.getByRole('link', { name: project.name }));
    await user.click(
      await screen.findByRole('button', { name: 'Add feature' }),
    );
    expect(screen.getByRole('dialog', { name: 'Create feature' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'Feature origin' })).toBeVisible();
    expect(screen.queryByLabelText('Feature brief')).toBeNull();
    expect(screen.queryByLabelText('Include in project context')).toBeNull();
  });

  it('does not intercept modified navigation-link clicks', async () => {
    window.localStorage.setItem('featurewise.accessToken', 'stored-token');
    const { testRouter } = renderRoute('/');
    const logo = await screen.findByRole('link', {
      name: 'Featurewise home',
    });

    expect(fireEvent.click(logo, { ctrlKey: true })).toBe(true);
    await waitFor(() => {
      expect(testRouter.state.location.pathname).toBe('/');
    });
  });
});
