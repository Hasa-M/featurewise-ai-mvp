import { matchPath, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@/features/auth';
import {
  FeatureActionsProvider,
  type FeatureCreateSuccessBehavior,
  type FeatureDeleteSuccessBehavior,
  type Feature,
} from '@/features/features';
import { WorkspaceActionsProvider } from '@/features/workspace';
import { PageHeaderRegistrationProvider } from '@/shared/model';

export function EntityActionsRoute() {
  const { accessToken, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!accessToken || !user) return <Outlet />;

  function handleCreated(
    feature: Feature,
    behavior: FeatureCreateSuccessBehavior,
  ) {
    if (behavior === 'open-created') {
      void navigate(`/projects/${feature.projectId}/features/${feature.id}`);
    }
  }

  function handleDeleted(
    feature: Feature,
    behavior: FeatureDeleteSuccessBehavior,
  ) {
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

