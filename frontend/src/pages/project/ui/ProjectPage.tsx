import {
  FileText,
  FolderClosed,
  FolderKanban,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/features/auth';
import {
  getFeaturePath,
  useFeatureActions,
  useProjectFeatures,
  type Feature,
} from '@/features/features';
import {
  getProjectPath,
  useProject,
  useProjectActions,
} from '@/features/workspace';
import { ApiError } from '@/shared/api';
import { usePageHeaderRegistration } from '@/shared/model';
import { Breadcrumb } from '@/shared/ui/breadcrumb';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { MenuItem } from '@/shared/ui/menu';
import { MenuPopover } from '@/shared/ui/menu-popover';
import { Tabs, type TabsItems } from '@/shared/ui/tabs';

import styles from './ProjectPage.module.css';

const PROJECT_TAB_IDS = ['features', 'context'] as const;
type ProjectTabId = (typeof PROJECT_TAB_IDS)[number];

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
});

function isProjectTabId(value: string | null): value is ProjectTabId {
  return PROJECT_TAB_IDS.some((tabId) => tabId === value);
}

function isNotFound(error: unknown) {
  return (
    error instanceof ApiError &&
    (error.status === 400 || error.status === 404)
  );
}

function FeatureCard({
  feature,
  onDelete,
  onEdit,
  projectPublicKey,
}: {
  readonly feature: Feature;
  readonly onDelete: (feature: Feature) => void;
  readonly onEdit: (feature: Feature) => void;
  readonly projectPublicKey: string;
}) {
  return (
    <li className={styles.featureItem}>
      <Card className={styles.featureCard} height='100%' width='100%'>
        <article className={styles.cardContent}>
          <div className={styles.cardHeading}>
            <span aria-hidden='true' className={styles.featureIcon}>
              <FileText size={18} strokeWidth={1.75} />
            </span>
            <h2 className={styles.featureTitle}>
              <Link
                aria-describedby={`feature-${feature.publicKey}-specification`}
                className={styles.featureLink}
                to={getFeaturePath(projectPublicKey, feature.publicKey)}
              >
                {feature.title}
              </Link>
            </h2>
            <div className={styles.cardMenu}>
              <MenuPopover label={`Open ${feature.title} feature menu`}>
                <MenuItem
                  leadingIcon={<Pencil size={16} strokeWidth={1.75} />}
                  onClick={() => onEdit(feature)}
                >
                  Edit feature
                </MenuItem>
                <MenuItem
                  leadingIcon={<Trash2 size={16} strokeWidth={1.75} />}
                  onClick={() => onDelete(feature)}
                  variant='danger'
                >
                  Delete feature
                </MenuItem>
              </MenuPopover>
            </div>
          </div>

          <p
            className={styles.specification}
            id={`feature-${feature.publicKey}-specification`}
          >
            {feature.specificationContent || 'No feature specification yet.'}
          </p>

          <time
            className={styles.updatedAt}
            dateTime={feature.updatedAt.toISOString()}
          >
            Updated {dateFormatter.format(feature.updatedAt)}
          </time>
        </article>
      </Card>
    </li>
  );
}

function FeatureCards({
  features,
  onDelete,
  onEdit,
  projectPublicKey,
}: {
  readonly features: readonly Feature[];
  readonly onDelete: (feature: Feature) => void;
  readonly onEdit: (feature: Feature) => void;
  readonly projectPublicKey: string;
}) {
  if (features.length === 0) {
    return (
      <p className={styles.status} role='status'>
        No features yet.
      </p>
    );
  }

  return (
    <ul className={styles.featureList}>
      {features.map((feature) => (
        <FeatureCard
          feature={feature}
          key={feature.publicKey}
          onDelete={onDelete}
          onEdit={onEdit}
          projectPublicKey={projectPublicKey}
        />
      ))}
    </ul>
  );
}

function ProjectContextPanel() {
  return (
    <section
      aria-labelledby='project-context-editor-title'
      className={styles.contextPlaceholder}
    >
      <span aria-hidden='true' className={styles.contextIcon}>
        <FileText size={22} strokeWidth={1.75} />
      </span>
      <div>
        <p className='fw-overline'>Unavailable</p>
        <h2 id='project-context-editor-title'>Project context is not available yet</h2>
        <p>
          Editable project-level context will appear here when its backend
          contract is implemented.
        </p>
      </div>
    </section>
  );
}

interface ProjectContentProps {
  readonly accessToken: string;
  readonly organizationKey: string;
  readonly projectKey: string;
}

function ProjectContent({
  accessToken,
  organizationKey,
  projectKey,
}: ProjectContentProps) {
  const projectQuery = useProject(accessToken, organizationKey, projectKey);
  const featuresQuery = useProjectFeatures(accessToken, projectKey);
  const { openEdit: openEditProject } = useProjectActions();
  const featureActions = useFeatureActions();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab: ProjectTabId = isProjectTabId(requestedTab)
    ? requestedTab
    : 'features';
  const projectNotFound = projectQuery.isError && isNotFound(projectQuery.error);
  const tabs = useMemo<TabsItems>(
    () => [
      {
        id: 'features',
        info: featuresQuery.data?.length,
        label: 'Features',
        panelId: 'project-features-panel',
        tabId: 'project-features-tab',
      },
      {
        id: 'context',
        label: 'Project context',
        panelId: 'project-context-panel',
        tabId: 'project-context-tab',
      },
    ],
    [featuresQuery.data?.length],
  );
  const pageHeader = useMemo(
    () => ({
      actions: projectQuery.data ? (
        <>
          <Button
            leadingIcon={<Pencil size={16} strokeWidth={1.75} />}
            onClick={() => openEditProject(projectQuery.data)}
            variant='secondary'
          >
            Edit project
          </Button>
          {activeTab === 'features' ? (
            <Button
              leadingIcon={<Plus size={16} strokeWidth={1.75} />}
              onClick={() =>
                featureActions.openCreate({
                  projectKey: projectQuery.data.publicKey,
                })
              }
            >
              Add feature
            </Button>
          ) : null}
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
              label: projectNotFound
                ? 'Project not found'
                : projectQuery.data?.name ?? 'Project',
            },
          ]}
          titleId='project-title'
        />
      ),
      subtitle: projectQuery.data
        ? activeTab === 'features'
          ? 'Open a feature to edit its specification and supporting context.'
          : 'Project-level context editing is not available yet.'
        : undefined,
    }),
    [
      activeTab,
      featureActions,
      openEditProject,
      projectKey,
      projectNotFound,
      projectQuery.data,
    ],
  );
  usePageHeaderRegistration(pageHeader);

  useEffect(() => {
    if (requestedTab === activeTab) return;

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('tab', activeTab);
    setSearchParams(nextSearchParams, { replace: true });
  }, [activeTab, requestedTab, searchParams, setSearchParams]);

  if (projectQuery.isPending) {
    return <p className={styles.status}>Loading project...</p>;
  }

  if (projectQuery.isError) {
    if (isNotFound(projectQuery.error)) {
      return (
        <section className={styles.page} aria-labelledby='project-title'>
          <p className='fw-overline'>404</p>
          <p className={styles.status}>
            This project does not exist or is not available.
          </p>
        </section>
      );
    }

    return (
      <div className={styles.status} role='alert'>
        <p>The project could not be loaded.</p>
        <Button onClick={() => void projectQuery.refetch()} size='small'>
          Retry
        </Button>
      </div>
    );
  }

  const activeTabItem = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <section className={styles.page} aria-labelledby='project-title'>
      <Tabs
        aria-label='Project workspace'
        items={tabs}
        onValueChange={(value) => {
          if (!isProjectTabId(value)) return;

          const nextSearchParams = new URLSearchParams(searchParams);
          nextSearchParams.set('tab', value);
          setSearchParams(nextSearchParams);
        }}
        value={activeTab}
      />

      <div
        aria-labelledby={activeTabItem.tabId}
        id={activeTabItem.panelId}
        role='tabpanel'
        tabIndex={0}
      >
        {featuresQuery.isPending ? (
          <p className={styles.status} role='status'>
            Loading features...
          </p>
        ) : featuresQuery.isError ? (
          <div className={styles.status} role='alert'>
            <p>Features could not be loaded.</p>
            <Button onClick={() => void featuresQuery.refetch()} size='small'>
              Retry
            </Button>
          </div>
        ) : activeTab === 'features' ? (
          <FeatureCards
            features={featuresQuery.data}
            onDelete={featureActions.openDelete}
            onEdit={featureActions.openEdit}
            projectPublicKey={projectQuery.data.publicKey}
          />
        ) : (
          <ProjectContextPanel />
        )}
      </div>
    </section>
  );
}

export function ProjectPage() {
  const { accessToken, user } = useAuth();
  const { projectKey } = useParams();

  if (!projectKey) {
    return (
      <section className={styles.page}>
        <p className='fw-overline'>404</p>
        <h1>Project not found</h1>
        <p className={styles.status}>The project address is invalid.</p>
      </section>
    );
  }

  if (!accessToken || !user) return null;

  return (
    <ProjectContent
      accessToken={accessToken}
      organizationKey={user.organizationKey}
      projectKey={projectKey}
    />
  );
}
