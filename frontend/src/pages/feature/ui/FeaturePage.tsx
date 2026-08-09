import {
  FileText,
  FolderClosed,
  FolderKanban,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/features/auth';
import {
  getFeaturePath,
  useFeature,
  useFeatureActions,
} from '@/features/features';
import { getProjectPath, useProject } from '@/features/workspace';
import { ApiError } from '@/shared/api';
import {
  useCanonicalPath,
  usePageHeaderRegistration,
} from '@/shared/model';
import { Breadcrumb } from '@/shared/ui/breadcrumb';
import { Button } from '@/shared/ui/button';
import { Tabs, type TabsItems } from '@/shared/ui/tabs';

import styles from './FeaturePage.module.css';

const FEATURE_TABS = [
  {
    id: 'context',
    label: 'Context',
    panelId: 'feature-context-panel',
    tabId: 'feature-context-tab',
  },
  {
    id: 'generations',
    label: 'Generations',
    panelId: 'feature-generations-panel',
    tabId: 'feature-generations-tab',
  },
  {
    id: 'updates',
    label: 'Updates',
    panelId: 'feature-updates-panel',
    tabId: 'feature-updates-tab',
  },
  {
    id: 'specifications',
    label: 'Specifications',
    panelId: 'feature-specifications-panel',
    tabId: 'feature-specifications-tab',
  },
] as const satisfies TabsItems;

type FeatureTabId = (typeof FEATURE_TABS)[number]['id'];

const FEATURE_TAB_COPY: Record<FeatureTabId, string> = {
  context: 'Context data entry will be added in the next milestone.',
  generations:
    'Generation history and controls will be added in a later milestone.',
  updates: 'Feature updates will be added in a later milestone.',
  specifications:
    'Specification review will be added in a later milestone.',
};

function isFeatureTabId(value: string | null): value is FeatureTabId {
  return FEATURE_TABS.some((tab) => tab.id === value);
}

function isNotFound(error: unknown) {
  return (
    error instanceof ApiError &&
    (error.status === 400 || error.status === 404)
  );
}

interface FeatureContentProps {
  readonly accessToken: string;
  readonly featureKey: string;
  readonly organizationId: string;
  readonly projectId: string;
  readonly projectKey: string;
}

function FeatureContent({
  accessToken,
  featureKey,
  organizationId,
  projectId,
  projectKey,
}: FeatureContentProps) {
  const projectQuery = useProject(accessToken, organizationId, projectKey);
  const featureQuery = useFeature(
    accessToken,
    projectId,
    projectKey,
    featureKey,
    projectQuery.data?.publicKey,
  );
  const featureActions = useFeatureActions();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab: FeatureTabId = isFeatureTabId(requestedTab)
    ? requestedTab
    : 'context';
  const targetMismatch =
    featureQuery.isSuccess && featureQuery.data.projectId !== projectId;
  const notFound =
    targetMismatch ||
    (projectQuery.isError && isNotFound(projectQuery.error)) ||
    (featureQuery.isError && isNotFound(featureQuery.error));
  useCanonicalPath(
    projectQuery.data && featureQuery.data && !targetMismatch
      ? getFeaturePath(
          projectQuery.data.publicKey,
          featureQuery.data.publicKey,
        )
      : undefined,
  );
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
              href: getProjectPath(
                projectQuery.data?.publicKey ?? projectKey,
              ),
              icon: <FolderKanban size={14} strokeWidth={1.75} />,
              kind: 'item' as const,
              label: projectQuery.data?.name ?? 'Project',
            },
            {
              href: getProjectPath(
                projectQuery.data?.publicKey ?? projectKey,
              ),
              icon: <FolderClosed size={14} strokeWidth={1.75} />,
              kind: 'folder' as const,
              label: 'Features',
            },
            {
              href: getFeaturePath(
                projectQuery.data?.publicKey ?? projectKey,
                featureQuery.data?.publicKey ?? featureKey,
              ),
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
      subtitle:
        featureQuery.data && !targetMismatch
          ? 'Manage feature context, generations, updates, and specifications.'
          : undefined,
    }),
    [
      featureActions,
      featureKey,
      featureQuery.data,
      notFound,
      projectKey,
      projectQuery.data?.name,
      projectQuery.data?.publicKey,
      targetMismatch,
    ],
  );
  usePageHeaderRegistration(pageHeader);

  useEffect(() => {
    if (requestedTab === activeTab) return;

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('tab', activeTab);
    setSearchParams(nextSearchParams, { replace: true });
  }, [activeTab, requestedTab, searchParams, setSearchParams]);

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

  const activeTabItem =
    FEATURE_TABS.find((tab) => tab.id === activeTab) ?? FEATURE_TABS[0];

  return (
    <section className={styles.page} aria-labelledby="feature-title">
      <Tabs
        aria-label="Feature workspace"
        items={FEATURE_TABS}
        onValueChange={(value) => {
          if (!isFeatureTabId(value)) return;

          const nextSearchParams = new URLSearchParams(searchParams);
          nextSearchParams.set('tab', value);
          setSearchParams(nextSearchParams);
        }}
        value={activeTab}
      />
      <div
        aria-labelledby={activeTabItem.tabId}
        className={styles.placeholder}
        id={activeTabItem.panelId}
        role="tabpanel"
        tabIndex={0}
      >
        {FEATURE_TAB_COPY[activeTab]}
      </div>
    </section>
  );
}

export function FeaturePage() {
  const { accessToken, user } = useAuth();
  const { featureKey, projectKey } = useParams();

  if (!featureKey || !projectKey) {
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
      featureKey={featureKey}
      organizationId={user.organizationId}
      projectId={user.projectId}
      projectKey={projectKey}
    />
  );
}
