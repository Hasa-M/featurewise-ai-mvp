import { QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
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

vi.mock('@/shared/ui/rich-text', () => ({
  RichText: ({
    'aria-label': ariaLabel,
    defaultValue,
    disabled,
    onChange,
  }: {
    readonly 'aria-label'?: string;
    readonly defaultValue?: string;
    readonly disabled?: boolean;
    readonly onChange?: (value: string) => void;
  }) => (
    <textarea
      aria-label={ariaLabel}
      defaultValue={defaultValue}
      disabled={disabled}
      onChange={(event) => onChange?.(event.currentTarget.value)}
    />
  ),
}));

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
  createdAt: '2026-07-18T10:00:00.000Z',
  createdByKey: currentUser.userKey,
  projectKey: project.publicKey,
  publicKey: 'FEAT-5831',
  specificationContent:
    'Users authenticate with their workspace credentials.',
  title: 'Authentication workflow',
  updatedAt: '2026-07-18T10:00:00.000Z',
};

const featureContext = {
  content: '',
  createdAt: '2026-07-18T10:00:00.000Z',
  featureKey: feature.publicKey,
  files: [],
  publicKey: 'CTX-19',
  updatedAt: '2026-07-18T10:00:00.000Z',
};

const projectContext = {
  content: '',
  createdAt: '2026-07-18T10:00:00.000Z',
  projectKey: project.publicKey,
  publicKey: 'PCTX-31',
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
  if (path === `/api/projects/${project.publicKey}/context`) {
    if (init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body)) as { content: string };
      return Promise.resolve(jsonResponse({ ...projectContext, ...body }));
    }
    return Promise.resolve(jsonResponse(projectContext));
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
    expect(screen.getByText('Local-first MVP · single-user.')).toBeVisible();
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
      expect(testRouter.state.location.search).toBe('?tab=specification');
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

  it('renders feature cards with the canonical specification and no obsolete projections', async () => {
    window.localStorage.setItem('featurewise.accessToken', 'stored-token');
    renderRoute(`/projects/${project.publicKey}`);

    expect(
      await screen.findByRole('heading', { name: feature.title }),
    ).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Features' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByText(feature.specificationContent)).toBeVisible();
    expect(screen.queryByText('Brand new')).toBeNull();
    expect(screen.queryByText('Aligned')).toBeNull();
    expect(screen.queryByText('Project context usage')).toBeNull();
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

  it('deep-links to editable ProjectContext without loading unrelated Features', async () => {
    window.localStorage.setItem('featurewise.accessToken', 'stored-token');
    const fetchMock = vi.mocked(fetch);
    const { queryClient } = renderRoute(
      `/projects/${project.publicKey}?tab=context&view=compact`,
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Shared project context',
      }),
    ).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Project context' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      screen.getByText(
        'Add shared project-level context for future feature analyses.',
      ),
    ).toBeVisible();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(
      fetchMock.mock.calls.some(
        ([input]) =>
          requestPath(input) ===
          `/api/projects/${project.publicKey}/features`,
      ),
    ).toBe(false);
    expect(
      fetchMock.mock.calls.filter(
        ([input]) =>
          requestPath(input) ===
          `/api/projects/${project.publicKey}/context`,
      ),
    ).toHaveLength(1);
    expect(
      queryClient.getQueryData(['project-context', project.publicKey]),
    ).toMatchObject({
      content: '',
      projectKey: project.publicKey,
      publicKey: 'PCTX-31',
    });
    expect(
      queryClient
        .getQueryCache()
        .getAll()
        .some((query) => String(query.queryKey[0]).includes('analysis')),
    ).toBe(false);
  });

  it('normalizes an invalid feature tab while preserving other query parameters', async () => {
    window.localStorage.setItem('featurewise.accessToken', 'stored-token');
    const { testRouter } = renderRoute(
      `/projects/${project.publicKey}/features/${feature.publicKey}?tab=unknown&view=compact`,
    );

    expect(
      await screen.findByRole('heading', { name: feature.title }),
    ).toBeVisible();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'Specification' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      await screen.findByRole('heading', { name: 'Feature specification' }),
    ).toBeVisible();
    await waitFor(() => {
      expect(testRouter.state.location.search).toBe(
        '?tab=specification&view=compact',
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
    const { queryClient, testRouter } = renderRoute(
      `/projects/${project.publicKey}/features/${feature.publicKey}?tab=analyses&view=compact`,
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Analyses are unavailable',
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        'Analysis execution and evidence-backed findings are deferred and are not available in the Console.',
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        'Edit the feature specification, manage supporting context, and review analyses when available.',
      ),
    ).toBeVisible();
    const analysesTab = screen.getByRole('tab', { name: 'Analyses' });
    const analysesPanel = screen.getByRole('tabpanel');
    expect(analysesTab).toHaveAttribute('aria-selected', 'true');
    expect(analysesTab).toHaveAttribute(
      'aria-controls',
      'feature-analyses-panel',
    );
    expect(analysesPanel).toHaveAttribute(
      'aria-labelledby',
      'feature-analyses-tab',
    );

    const featureRequestsBeforeSwitch = fetchMock.mock.calls.filter(
      ([input]) =>
        requestPath(input) ===
        `/api/projects/${project.publicKey}/features/${feature.publicKey}`,
    ).length;
    await user.click(screen.getByRole('tab', { name: 'Context' }));

    await waitFor(() => {
      expect(testRouter.state.location.search).toBe(
        '?tab=context&view=compact',
      );
    });
    expect(
      screen.getByRole('heading', { name: 'Notes and constraints' }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Selected context files' }),
    ).toBeVisible();
    expect(
      fetchMock.mock.calls.filter(
        ([input]) =>
          requestPath(input) ===
          `/api/projects/${project.publicKey}/features/${feature.publicKey}`,
      ),
    ).toHaveLength(featureRequestsBeforeSwitch);
    expect(
      fetchMock.mock.calls.some(([input]) =>
        requestPath(input).includes('/analysis'),
      ),
    ).toBe(false);
    expect(
      queryClient
        .getQueryCache()
        .getAll()
        .some((query) => String(query.queryKey[0]).includes('analysis')),
    ).toBe(false);

    await testRouter.navigate(-1);
    await waitFor(() => {
      expect(testRouter.state.location.search).toBe(
        '?tab=analyses&view=compact',
      );
      expect(analysesTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  it(
    'edits the canonical specification with no legacy request fields',
    async () => {
      window.localStorage.setItem('featurewise.accessToken', 'stored-token');
      let requestBody: Record<string, unknown> | undefined;
      vi.stubGlobal(
        'fetch',
        vi.fn(
          (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
            const path = requestPath(input);

            if (
              path === `/api/features/${feature.publicKey}` &&
              init?.method === 'PATCH'
            ) {
              requestBody = JSON.parse(String(init.body)) as Record<
                string,
                unknown
              >;
              return Promise.resolve(
                jsonResponse({ ...feature, ...requestBody }),
              );
            }

            return defaultFetch(input, init);
          },
        ),
      );
      const user = userEvent.setup();
      renderRoute(
        `/projects/${project.publicKey}/features/${feature.publicKey}`,
      );

      const specification = await screen.findByLabelText(
        'Feature specification',
      );
      await user.clear(specification);
      await user.type(specification, 'Updated acceptance criteria.');
      await user.click(
        screen.getByRole('button', { name: 'Save specification' }),
      );

      await waitFor(() => {
        expect(requestBody).toEqual({
          specificationContent: 'Updated acceptance criteria.',
        });
      });
    },
    10_000,
  );

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

  it('creates, edits, opens, and deletes Features with exact request contracts', async () => {
    window.localStorage.setItem('featurewise.accessToken', 'stored-token');
    const createdFeature = {
      ...feature,
      publicKey: 'FEAT-5832',
      specificationContent: 'Users can save their preferred filters.',
      title: 'Saved filters',
    };
    const requestBodies: Record<string, unknown>[] = [];
    const fetchMock = vi.fn(
      (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const path = requestPath(input);

        if (
          path === `/api/features/${feature.publicKey}` &&
          init?.method === 'PATCH'
        ) {
          const body = JSON.parse(String(init.body)) as Record<string, unknown>;
          requestBodies.push(body);
          return Promise.resolve(jsonResponse({ ...feature, ...body }));
        }
        if (
          path === `/api/projects/${project.publicKey}/features` &&
          init?.method === 'POST'
        ) {
          const body = JSON.parse(String(init.body)) as Record<string, unknown>;
          requestBodies.push(body);
          return Promise.resolve(jsonResponse(createdFeature, 201));
        }
        if (
          path === `/api/features/${createdFeature.publicKey}` &&
          init?.method === 'DELETE'
        ) {
          return Promise.resolve(new Response(null, { status: 204 }));
        }

        return defaultFetch(input, init);
      },
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    const { testRouter } = renderRoute(
      `/projects/${project.publicKey}/features/${feature.publicKey}`,
    );

    await user.click(
      await screen.findByRole('button', { name: 'Edit feature' }),
    );
    const editDialog = screen.getByRole('dialog', { name: 'Edit feature' });
    expect(editDialog).toBeVisible();
    const editTitle = within(editDialog).getByLabelText('Feature title');
    expect(editTitle).toBeVisible();
    expect(within(editDialog).queryByLabelText('Feature specification')).toBeNull();
    await user.clear(editTitle);
    await user.type(editTitle, 'Renamed authentication workflow');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Renamed authentication workflow',
      }),
    ).toBeVisible();

    await user.click(screen.getByRole('link', { name: project.name }));
    await user.click(
      await screen.findByRole('button', { name: 'Add feature' }),
    );
    expect(screen.getByRole('dialog', { name: 'Create feature' })).toBeVisible();
    const createTitle = screen.getByLabelText('Feature title');
    const createSpecification = screen.getByLabelText('Feature specification');
    await user.type(createTitle, createdFeature.title);
    await user.type(
      createSpecification,
      createdFeature.specificationContent,
    );
    await user.click(screen.getByRole('button', { name: 'Create feature' }));

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: createdFeature.title,
      }),
    ).toBeVisible();
    await waitFor(() => {
      expect(testRouter.state.location.pathname).toBe(
        `/projects/${project.publicKey}/features/${createdFeature.publicKey}`,
      );
      expect(testRouter.state.location.search).toBe('?tab=specification');
    });
    expect(requestBodies).toEqual([
      { title: 'Renamed authentication workflow' },
      {
        specificationContent: createdFeature.specificationContent,
        title: createdFeature.title,
      },
    ]);

    await user.click(screen.getByRole('button', { name: 'Delete feature' }));
    const deleteDialog = screen.getByRole('dialog', {
      name: 'Delete feature?',
    });
    await user.click(
      within(deleteDialog).getByRole('button', { name: 'Delete feature' }),
    );
    await waitFor(() => {
      expect(testRouter.state.location.pathname).toBe(
        `/projects/${project.publicKey}`,
      );
    });
    expect(
      fetchMock.mock.calls.some(
        ([input, init]) =>
          requestPath(input) ===
            `/api/features/${createdFeature.publicKey}` &&
          init?.method === 'DELETE',
      ),
    ).toBe(true);
    expect(
      screen.queryByRole('heading', {
        level: 2,
        name: createdFeature.title,
      }),
    ).toBeNull();
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
