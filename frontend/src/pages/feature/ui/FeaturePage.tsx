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
import { FeatureContextPanel } from '@/features/context';
import {
  FeatureSpecificationPanel,
  getFeaturePath,
  useFeature,
  useFeatureActions,
} from '@/features/features';
import { getProjectPath, useProject } from '@/features/workspace';
import { ApiError } from '@/shared/api';
import { usePageHeaderRegistration } from '@/shared/model';
import { Breadcrumb } from '@/shared/ui/breadcrumb';
import { Button } from '@/shared/ui/button';
import { Tabs, type TabsItems } from '@/shared/ui/tabs';

import styles from './FeaturePage.module.css';

const FEATURE_TABS = [
  {
    id: 'specification',
    label: 'Specification',
    panelId: 'feature-specification-panel',
    tabId: 'feature-specification-tab',
  },
  {
    id: 'context',
    label: 'Context',
    panelId: 'feature-context-panel',
    tabId: 'feature-context-tab',
  },
  {
    id: 'analyses',
    label: 'Analyses',
    panelId: 'feature-analyses-panel',
    tabId: 'feature-analyses-tab',
  },
] as const satisfies TabsItems;

type FeatureTabId = (typeof FEATURE_TABS)[number]['id'];

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
  readonly organizationKey: string;
  readonly projectKey: string;
}

function FeatureContent({
  accessToken,
  featureKey,
  organizationKey,
  projectKey,
}: FeatureContentProps) {
  const projectQuery = useProject(accessToken, organizationKey, projectKey);
  const featureQuery = useFeature(accessToken, projectKey, featureKey);
  const featureActions = useFeatureActions();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab: FeatureTabId = isFeatureTabId(requestedTab)
    ? requestedTab
    : 'specification';
  const targetMismatch =
    featureQuery.isSuccess && featureQuery.data.projectKey !== projectKey;
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
          ? 'Edit the feature specification, manage supporting context, and review analyses when available.'
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
        className={activeTab === 'analyses' ? styles.placeholder : styles.contentPanel}
        id={activeTabItem.panelId}
        role="tabpanel"
        tabIndex={0}
      >
        {activeTab === 'specification' ? (
          <FeatureSpecificationPanel
            accessToken={accessToken}
            feature={featureQuery.data}
          />
        ) : activeTab === 'context' ? (
          <FeatureContextPanel
            accessToken={accessToken}
            featureKey={featureQuery.data.publicKey}
          />
        ) : (
          <section aria-labelledby='feature-analyses-title'>
            <p className='fw-overline'>Unavailable</p>
            <h2 id='feature-analyses-title'>Analyses are unavailable</h2>
            <p>
              Analysis execution and evidence-backed findings are deferred and
              are not available in the Console.
            </p>
          </section>
        )}
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
      organizationKey={user.organizationKey}
      projectKey={projectKey}
    />
  );
}
