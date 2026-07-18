import { createBrowserRouter, type RouteObject } from 'react-router-dom';

import { AppShell } from '@/app/layout';
import { AnonymousRoute, AuthenticatedRoute } from '@/features/auth';
import { HomePage } from '@/pages/home';
import { LoginPage } from '@/pages/login';
import { NotFoundPage } from '@/pages/not-found';

export const routes: RouteObject[] = [
  {
    element: <AnonymousRoute />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
    ],
  },
  {
    element: <AuthenticatedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: '/',
            element: <HomePage />,
          },
          {
            path: '*',
            element: <NotFoundPage />,
          },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
