import { createBrowserRouter, type RouteObject } from 'react-router-dom';

import { AppShell } from '@/app/layout';
import { AnonymousRoute, AuthenticatedRoute } from '@/features/auth';
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
            lazy: async () => ({
              Component: (await import('@/pages/projects')).ProjectsPage,
            }),
          },
          {
            path: '/projects/:projectId',
            lazy: async () => ({
              Component: (await import('@/pages/project')).ProjectPage,
            }),
          },
          {
            path: '/projects/:projectId/features/:featureId',
            lazy: async () => ({
              Component: (await import('@/pages/feature')).FeaturePage,
            }),
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
