import { useParams } from 'react-router-dom';

import { useAuth } from '@/features/auth';
import { useFeature } from '@/features/features';
import { ApiError } from '@/shared/api';
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
  readonly projectId: string;
}

function FeatureContent({
  accessToken,
  featureId,
  projectId,
}: FeatureContentProps) {
  const featureQuery = useFeature(accessToken, projectId, featureId);

  if (featureQuery.isPending) {
    return <p className={styles.status}>Loading feature...</p>;
  }

  if (
    featureQuery.isError ||
    featureQuery.data.projectId !== projectId
  ) {
    if (
      !featureQuery.isError ||
      isNotFound(featureQuery.error)
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
        <Button onClick={() => void featureQuery.refetch()} size="small">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <section className={styles.page} aria-labelledby="feature-title">
      <div className={styles.heading}>
        <p className="fw-overline">Feature</p>
        <h1 id="feature-title">{featureQuery.data.title}</h1>
      </div>
      <div className={styles.placeholder}>
        Feature workspace content will be added in a future milestone.
      </div>
    </section>
  );
}

export function FeaturePage() {
  const { accessToken } = useAuth();
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

  if (!accessToken) return null;

  return (
    <FeatureContent
      accessToken={accessToken}
      featureId={featureId}
      projectId={projectId}
    />
  );
}
