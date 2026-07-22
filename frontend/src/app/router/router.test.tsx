import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppQueryClient } from '@/app/query/query-client';
import { AuthProvider } from '@/features/auth';

import { routes } from './router';

const currentUser = {
  organizationId: '11111111-1111-4111-8111-111111111111',
  projectId: '22222222-2222-4222-8222-222222222222',
  userId: '33333333-3333-4333-8333-333333333333',
  username: 'marco',
};

const organization = {
  createdAt: '2026-07-18T10:00:00.000Z',
  id: currentUser.organizationId,
  name: 'Northstar Labs',
  updatedAt: '2026-07-18T10:00:00.000Z',
};

const project = {
  createdAt: '2026-07-18T10:00:00.000Z',
  id: currentUser.projectId,
  name: 'Northstar mobile',
  organizationId: currentUser.organizationId,
  updatedAt: '2026-07-18T10:00:00.000Z',
};

const feature = {
  alignment: { pendingUpdates: [], status: 'aligned' },
  brief: null,
  createdAt: '2026-07-18T10:00:00.000Z',
  createdById: currentUser.userId,
  id: '44444444-4444-4444-8444-444444444444',
  includeInProjectContext: false,
  origin: 'brand_new',
  projectId: project.id,
  title: 'Authentication workflow',
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
  if (path === `/api/organizations/${organization.id}`) {
    if (init?.method === 'PATCH') {
      return Promise.resolve(
        jsonResponse({ ...organization, name: 'Renamed workspace' }),
      );
    }
    return Promise.resolve(jsonResponse(organization));
  }
  if (path === `/api/organizations/${organization.id}/projects`) {
    return Promise.resolve(jsonResponse([project]));
  }
  if (path === `/api/projects/${project.id}`) {
    return Promise.resolve(jsonResponse(project));
  }
  if (path === `/api/projects/${project.id}/features`) {
    return Promise.resolve(jsonResponse([feature]));
  }
  if (path === `/api/features/${feature.id}`) {
    return Promise.resolve(jsonResponse(feature));
  }

  return Promise.resolve(jsonResponse({ message: 'Not found' }, 404));
}

function renderRoute(path: string) {
  const testRouter = createMemoryRouter(routes, { initialEntries: [path] });
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

  it('restores a session and updates the organization cache from the header', async () => {
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
      await screen.findByRole('heading', { name: 'Northstar mobile' }),
    ).toBeVisible();
    await user.click(
      await screen.findByRole('link', { name: 'Authentication workflow' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Authentication workflow' }),
    ).toBeVisible();
    expect(testRouter.state.location.pathname).toBe(
      `/projects/${project.id}/features/${feature.id}`,
    );
    expect(
      fetchMock.mock.calls.filter(
        ([input]) =>
          requestPath(input) === `/api/projects/${project.id}/features`,
      ),
    ).toHaveLength(1);
    expect(
      fetchMock.mock.calls.some(
        ([input]) => requestPath(input) === `/api/projects/${project.id}`,
      ),
    ).toBe(false);
    expect(
      fetchMock.mock.calls.some(
        ([input]) => requestPath(input) === `/api/features/${feature.id}`,
      ),
    ).toBe(false);
  });

  it('keeps expanded navigation mounted and leaves placeholder actions inert', async () => {
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
    expect(testRouter.state.location.pathname).toBe('/');

    await user.click(
      screen.getByRole('link', { name: 'Go to Northstar mobile' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Northstar mobile' }),
    ).toBeVisible();
    expect(projectDisclosure).toHaveAttribute('aria-expanded', 'true');
    expect(
      await screen.findByRole('button', {
        name: 'Open Authentication workflow menu',
      }),
    ).toBeVisible();
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
