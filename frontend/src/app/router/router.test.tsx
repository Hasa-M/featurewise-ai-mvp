import { render, screen } from '@testing-library/react';
import {
  createMemoryRouter,
  RouterProvider,
} from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { routes } from './router';

describe('application routes', () => {
  it('renders the workspace root', () => {
    const testRouter = createMemoryRouter(routes, { initialEntries: ['/'] });

    render(<RouterProvider router={testRouter} />);

    expect(
      screen.getByRole('heading', { name: 'No project selected' }),
    ).toBeInTheDocument();
  });

  it('renders the not-found route', () => {
    const testRouter = createMemoryRouter(routes, {
      initialEntries: ['/missing'],
    });

    render(<RouterProvider router={testRouter} />);

    expect(
      screen.getByRole('heading', { name: 'Page not found' }),
    ).toBeInTheDocument();
  });
});
