import {
  FileText,
  FolderClosed,
  FolderKanban,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { useAuth } from '@/features/auth';
import { useFeature, useFeatureActions } from '@/features/features';
import { useProject } from '@/features/workspace';
import { ApiError } from '@/shared/api';
import { usePageHeaderRegistration } from '@/shared/model';
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
  const featureActions = useFeatureActions();
  const targetMismatch =
    featureQuery.isSuccess && featureQuery.data.projectId !== projectId;
  const notFound =
    targetMismatch ||
    (projectQuery.isError && isNotFound(projectQuery.error)) ||
    (featureQuery.isError && isNotFound(featureQuery.error));
  const pageHeader = useMemo(
    () => ({
      actions: featureQuery.data && !targetMismatch ? (
        <>
          <Button
            leadingIcon={<Pencil size={16} strokeWidth={1.75} />}
            onClick={() => featureActions.openEdit(featureQuery.data)}
            variant='secondary'
          >
            Edit feature
          </Button>
          <Button
            leadingIcon={<Trash2 size={16} strokeWidth={1.75} />}
            onClick={() => featureActions.openDelete(featureQuery.data)}
            variant='danger'
          >
            Delete feature
          </Button>
        </>
      ) : undefined,
      breadcrumb: (
        <Breadcrumb
          items={[
            {
              href: '/',
              icon: <FolderClosed size={14} strokeWidth={1.75} />,
              kind: 'folder' as const,
              label: 'Projects',
            },
            {
              href: `/projects/${projectId}`,
              icon: <FolderKanban size={14} strokeWidth={1.75} />,
              kind: 'item' as const,
              label: projectQuery.data?.name ?? 'Project',
            },
            {
              href: `/projects/${projectId}`,
              icon: <FolderClosed size={14} strokeWidth={1.75} />,
              kind: 'folder' as const,
              label: 'Features',
            },
            {
              href: `/projects/${projectId}/features/${featureId}`,
              icon: <FileText size={14} strokeWidth={1.75} />,
              kind: 'item' as const,
              label: notFound
                ? 'Feature not found'
                : featureQuery.data?.title ?? 'Feature',
            },
          ]}
          titleId='feature-title'
        />
      ),
    }),
    [
      featureActions,
      featureId,
      featureQuery.data,
      notFound,
      projectId,
      projectQuery.data?.name,
      targetMismatch,
    ],
  );
  usePageHeaderRegistration(pageHeader);

  if (projectQuery.isPending || featureQuery.isPending) {
    return <p className={styles.status}>Loading feature...</p>;
  }

  if (projectQuery.isError || featureQuery.isError || targetMismatch) {
    if (
      targetMismatch ||
      (projectQuery.isError && isNotFound(projectQuery.error)) ||
      (featureQuery.isError && isNotFound(featureQuery.error))
    ) {
      return (
        <section className={styles.page}>
          <p className="fw-overline">404</p>
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
