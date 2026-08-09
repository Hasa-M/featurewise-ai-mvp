import { useQueryClient } from '@tanstack/react-query';
import { matchPath, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@/features/auth';
import {
  FeatureActionsProvider,
  getFeaturePath,
  type FeatureCreateSuccessBehavior,
  type FeatureDeleteSuccessBehavior,
  type Feature,
} from '@/features/features';
import {
  adjustProjectFeatureCount,
  getProjectPath,
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
  const organizationKey = user.organizationKey;

  function updateCachedProjectFeatureCount(
    projectKey: string,
    difference: number,
  ) {
    queryClient.setQueryData<readonly ProjectSummary[]>(
      projectKeys.list(organizationKey),
      (current) =>
        adjustProjectFeatureCount(current, projectKey, difference),
    );
  }

  function handleCreated(
    feature: Feature,
    behavior: FeatureCreateSuccessBehavior,
  ) {
    updateCachedProjectFeatureCount(feature.projectKey, 1);

    if (behavior === 'open-created') {
      void navigate(
        getFeaturePath(feature.projectKey, feature.publicKey),
      );
    }
  }

  function handleDeleted(
    feature: Feature,
    behavior: FeatureDeleteSuccessBehavior,
  ) {
    updateCachedProjectFeatureCount(feature.projectKey, -1);

    if (behavior === 'stay') return;

    const match = matchPath(
      '/projects/:projectKey/features/:featureKey',
      location.pathname,
    );
    if (
      match?.params.featureKey === feature.publicKey
    ) {
      void navigate(getProjectPath(feature.projectKey));
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
