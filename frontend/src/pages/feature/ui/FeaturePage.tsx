import { FileText, FolderClosed, FolderKanban } from 'lucide-react';
import { useParams } from 'react-router-dom';

import { useAuth } from '@/features/auth';
import { useFeature } from '@/features/features';
import { useProject } from '@/features/workspace';
import { ApiError } from '@/shared/api';
import { Breadcrumb } from '@/shared/ui/breadcrumb';
import { Button } from '@/shared/ui/button';

import styles from './FeaturePage.module.css';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isNotFound(error: unknown) {
  return (
    error instanceof ApiError &&
    (error.status === 400 || error.status === 404)
  );
}

interface FeatureContentProps {
  readonly accessToken: string;
  readonly featureId: string;
  readonly organizationId: string;
  readonly projectId: string;
}

function FeatureContent({
  accessToken,
  featureId,
  organizationId,
  projectId,
}: FeatureContentProps) {
  const projectQuery = useProject(accessToken, organizationId, projectId);
  const featureQuery = useFeature(accessToken, projectId, featureId);

  if (projectQuery.isPending || featureQuery.isPending) {
    return <p className={styles.status}>Loading feature...</p>;
  }

  const targetMismatch =
    featureQuery.isSuccess && featureQuery.data.projectId !== projectId;

  if (projectQuery.isError || featureQuery.isError || targetMismatch) {
    if (
      targetMismatch ||
      (projectQuery.isError && isNotFound(projectQuery.error)) ||
      (featureQuery.isError && isNotFound(featureQuery.error))
    ) {
      return (
        <section className={styles.page}>
          <p className="fw-overline">404</p>
          <h1>Feature not found</h1>
          <p className={styles.status}>
            This feature does not exist in the selected project.
          </p>
        </section>
      );
    }

    return (
      <div className={styles.status} role="alert">
        <p>The feature could not be loaded.</p>
        <Button
          onClick={() => {
            void projectQuery.refetch();
            void featureQuery.refetch();
          }}
          size="small"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <section className={styles.page} aria-labelledby="feature-title">
      <div className={styles.heading}>
        <Breadcrumb
          items={[
            {
              href: '/',
              icon: <FolderClosed size={14} strokeWidth={1.75} />,
              kind: 'folder',
              label: 'Projects',
            },
            {
              href: `/projects/${projectId}`,
              icon: <FolderKanban size={14} strokeWidth={1.75} />,
              kind: 'item',
              label: projectQuery.data.name,
            },
            {
              href: `/projects/${projectId}`,
              icon: <FolderClosed size={14} strokeWidth={1.75} />,
              kind: 'folder',
              label: 'Features',
            },
            {
              href: `/projects/${projectId}/features/${featureId}`,
              icon: <FileText size={14} strokeWidth={1.75} />,
              kind: 'item',
              label: featureQuery.data.title,
            },
          ]}
          titleId={'feature-title'}
        />
      </div>
      <div className={styles.placeholder}>
        Feature workspace content will be added in a future milestone.
      </div>
    </section>
  );
}

export function FeaturePage() {
  const { accessToken, user } = useAuth();
  const { featureId, projectId } = useParams();

  if (
    !featureId ||
    !projectId ||
    !UUID_PATTERN.test(featureId) ||
    !UUID_PATTERN.test(projectId)
  ) {
    return (
      <section className={styles.page}>
        <p className="fw-overline">404</p>
        <h1>Feature not found</h1>
        <p className={styles.status}>The feature address is invalid.</p>
      </section>
    );
  }

  if (!accessToken || !user) return null;

  return (
    <FeatureContent
      accessToken={accessToken}
      featureId={featureId}
      organizationId={user.organizationId}
      projectId={projectId}
    />
  );
}
