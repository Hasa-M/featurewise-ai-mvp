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
  projectsQueryOptions,
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
  const authenticatedAccessToken = accessToken;
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

  async function resolveProjectPublicKey(projectId: string) {
    const projects = await queryClient.ensureQueryData(
      projectsQueryOptions(authenticatedAccessToken, organizationId),
    );

    return projects.find((project) => project.id === projectId)?.publicKey;
  }

  function handleCreated(
    feature: Feature,
    behavior: FeatureCreateSuccessBehavior,
  ) {
    updateCachedProjectFeatureCount(feature.projectId, 1);

    if (behavior === 'open-created') {
      void resolveProjectPublicKey(feature.projectId).then(
        (projectPublicKey) => {
          if (!projectPublicKey) return;

          void navigate(
            getFeaturePath(projectPublicKey, feature.publicKey),
          );
        },
      );
    }
  }

  function handleDeleted(
    feature: Feature,
    behavior: FeatureDeleteSuccessBehavior,
  ) {
    updateCachedProjectFeatureCount(feature.projectId, -1);

    if (behavior === 'stay') return;

    const match = matchPath(
      '/projects/:projectKey/features/:featureKey',
      location.pathname,
    );
    if (
      match?.params.featureKey === feature.id ||
      match?.params.featureKey === feature.publicKey
    ) {
      void resolveProjectPublicKey(feature.projectId).then(
        (projectPublicKey) => {
          if (!projectPublicKey) return;

          void navigate(getProjectPath(projectPublicKey));
        },
      );
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
