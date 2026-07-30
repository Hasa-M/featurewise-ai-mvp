import { useQueryClient } from '@tanstack/react-query';
import { matchPath, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@/features/auth';
import {
  FeatureActionsProvider,
  type FeatureCreateSuccessBehavior,
  type FeatureDeleteSuccessBehavior,
  type Feature,
} from '@/features/features';
import {
  adjustProjectFeatureCount,
  projectKeys,
  WorkspaceActionsProvider,
  type ProjectSummary,
} from '@/features/workspace';
import { PageHeaderRegistrationProvider } from '@/shared/model';

export function EntityActionsRoute() {
  const { accessToken, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!accessToken || !user) return <Outlet />;
  const organizationId = user.organizationId;

  function updateCachedProjectFeatureCount(
    projectId: string,
    difference: number,
  ) {
    queryClient.setQueryData<readonly ProjectSummary[]>(
      projectKeys.list(organizationId),
      (current) =>
        adjustProjectFeatureCount(current, projectId, difference),
    );
  }

  function handleCreated(
    feature: Feature,
    behavior: FeatureCreateSuccessBehavior,
  ) {
    updateCachedProjectFeatureCount(feature.projectId, 1);

    if (behavior === 'open-created') {
      void navigate(`/projects/${feature.projectId}/features/${feature.id}`);
    }
  }

  function handleDeleted(
    feature: Feature,
    behavior: FeatureDeleteSuccessBehavior,
  ) {
    updateCachedProjectFeatureCount(feature.projectId, -1);

    if (behavior === 'stay') return;

    const match = matchPath(
      '/projects/:projectId/features/:featureId',
      location.pathname,
    );
    if (match?.params.featureId === feature.id) {
      void navigate(`/projects/${feature.projectId}`);
    }
  }

  return (
    <PageHeaderRegistrationProvider>
      <WorkspaceActionsProvider accessToken={accessToken}>
        <FeatureActionsProvider
          accessToken={accessToken}
          onCreated={handleCreated}
          onDeleted={handleDeleted}
        >
          <Outlet />
        </FeatureActionsProvider>
      </WorkspaceActionsProvider>
    </PageHeaderRegistrationProvider>
  );
}
