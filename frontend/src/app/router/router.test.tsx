import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '@/features/auth';

import { routes } from './router';

const currentUser = {
  organizationId: 'organization-1',
  projectId: 'project-1',
  userId: 'user-1',
  username: 'marco',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

function renderRoute(path: string) {
  const testRouter = createMemoryRouter(routes, { initialEntries: [path] });

  render(
    <AuthProvider>
      <RouterProvider router={testRouter} />
    </AuthProvider>,
  );

  return testRouter;
}

describe('application routes', () => {
  beforeEach(() => {
    window.localStorage.clear();
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
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderRoute('/login');

    const username = screen.getByLabelText('Username');
    const password = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });

    expect(submitButton).toBeDisabled();

    await user.type(username, 'marco');
    expect(submitButton).toBeDisabled();

    await user.type(password, 'correct-password');
    expect(submitButton).toBeEnabled();

    await user.clear(username);
    expect(submitButton).toBeDisabled();
    expect(await screen.findByText('Enter your username.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('signs in, persists the token, and logs out', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        accessToken: 'access-token',
        expiresInSeconds: 43_200,
        tokenType: 'Bearer',
        user: currentUser,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    renderRoute('/login');

    await user.type(screen.getByLabelText('Username'), 'marco');
    await user.type(screen.getByLabelText('Password'), 'correct-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('heading', { name: 'No project selected' }),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem('featurewise.accessToken')).toBe(
      'access-token',
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ method: 'POST' }),
    );

    await user.click(screen.getByRole('button', { name: 'Log out' }));

    expect(
      await screen.findByRole('heading', { name: 'Sign in' }),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem('featurewise.accessToken')).toBeNull();
  });

  it('shows invalid credential feedback from the backend', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ message: 'Invalid username or password' }, 401),
      ),
    );
    renderRoute('/login');

    const password = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });

    await user.type(screen.getByLabelText('Username'), 'marco');
    await user.type(password, 'wrong-password');
    await user.click(submitButton);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid username or password.',
    );
    expect(submitButton).toBeDisabled();

    await user.type(password, '-corrected');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(submitButton).toBeEnabled();
  });

  it('restores a stored session through the current-user endpoint', async () => {
    window.localStorage.setItem('featurewise.accessToken', 'stored-token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(currentUser));
    vi.stubGlobal('fetch', fetchMock);
    renderRoute('/');

    expect(
      await screen.findByRole('heading', { name: 'No project selected' }),
    ).toBeInTheDocument();

    const requestOptions = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/me',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    expect(new Headers(requestOptions.headers).get('Authorization')).toBe(
      'Bearer stored-token',
    );
  });
});
