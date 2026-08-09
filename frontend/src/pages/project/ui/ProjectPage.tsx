import {
  FileText,
  FolderClosed,
  FolderKanban,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/features/auth';
import {
  getFeaturePath,
  useFeatureActions,
  useProjectFeatures,
  useUpdateFeature,
  type Feature,
} from '@/features/features';
import {
  getProjectPath,
  useProject,
  useProjectActions,
} from '@/features/workspace';
import { ApiError, getApiErrorMessage } from '@/shared/api';
import {
  useCanonicalPath,
  usePageHeaderRegistration,
} from '@/shared/model';
import { Breadcrumb } from '@/shared/ui/breadcrumb';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
import { MenuItem } from '@/shared/ui/menu';
import { MenuPopover } from '@/shared/ui/menu-popover';
import { Tabs, type TabsItems } from '@/shared/ui/tabs';
import { Tag } from '@/shared/ui/tag';

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

function formatOperationalLabel(value: string) {
  const label = value.replaceAll('_', ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function featureOriginLabel(origin: Feature['origin']) {
  return origin === 'brand_new' ? 'Brand new' : 'Mapped existing';
}

function generationCountLabel(count: number) {
  return `${count} ${count === 1 ? 'generation' : 'generations'}`;
}

function pendingUpdateLabel(count: number) {
  return count === 1 ? '1 update pending' : `${count} updates pending`;
}

function sameIds(left: ReadonlySet<string>, right: ReadonlySet<string>) {
  return (
    left.size === right.size && [...left].every((value) => right.has(value))
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
  const pendingUpdateCount = feature.alignment.pendingUpdates.length;
  const latestRun = feature.activity.latestFeatureRun;
  const contextUsage =
    latestRun === null
      ? 'No feature run yet'
      : latestRun.usedProjectContext === null
        ? 'Project context usage unavailable'
        : latestRun.usedProjectContext
          ? 'Project context used in latest run'
          : 'Project context not used in latest run';

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
                aria-describedby={`feature-${feature.id}-brief`}
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

          <p className={styles.brief} id={`feature-${feature.id}-brief`}>
            {feature.brief ?? 'No feature brief yet.'}
          </p>

          <div className={styles.tags}>
            <Tag className={styles.originTag}>
              {featureOriginLabel(feature.origin)}
            </Tag>
            <Tag
              className={
                feature.alignment.status === 'aligned'
                  ? styles.readyTag
                  : styles.attentionTag
              }
            >
              {feature.alignment.status === 'aligned'
                ? 'Aligned'
                : pendingUpdateLabel(pendingUpdateCount)}
            </Tag>
            <Tag
              className={
                feature.includeInProjectContext
                  ? styles.contextIncludedTag
                  : styles.contextExcludedTag
              }
            >
              {feature.includeInProjectContext
                ? 'Included in project context'
                : 'Not in project context'}
            </Tag>
          </div>

          <dl className={styles.metrics}>
            <div>
              <dt>Generation history</dt>
              <dd>{generationCountLabel(feature.activity.generationRunCount)}</dd>
            </div>
            <div>
              <dt>Validated specification</dt>
              <dd>
                {feature.activity.currentValidSpecVersion === null
                  ? 'None'
                  : `Version ${feature.activity.currentValidSpecVersion}`}
              </dd>
            </div>
            <div>
              <dt>Latest feature run</dt>
              <dd>
                {latestRun === null
                  ? 'None'
                  : `${formatOperationalLabel(latestRun.runKind)} · ${formatOperationalLabel(latestRun.status)}`}
              </dd>
            </div>
            <div>
              <dt>Project context usage</dt>
              <dd>{contextUsage}</dd>
            </div>
          </dl>

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
          key={feature.id}
          onDelete={onDelete}
          onEdit={onEdit}
          projectPublicKey={projectPublicKey}
        />
      ))}
    </ul>
  );
}

type SaveFeedback =
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'success'; readonly message: string };

function ProjectContextPanel({
  accessToken,
  features,
}: {
  readonly accessToken: string;
  readonly features: readonly Feature[];
}) {
  const updateFeatureMutation = useUpdateFeature(accessToken);
  const serverIncludedIds = useMemo(
    () =>
      new Set(
        features
          .filter((feature) => feature.includeInProjectContext)
          .map((feature) => feature.id),
      ),
    [features],
  );
  const serverSignature = features
    .map(
      (feature) =>
        `${feature.id}:${feature.includeInProjectContext ? 'included' : 'excluded'}`,
    )
    .join('|');
  const previousServerIds = useRef<ReadonlySet<string>>(serverIncludedIds);
  const [draftIncludedIds, setDraftIncludedIds] = useState<ReadonlySet<string>>(
    serverIncludedIds,
  );
  const [feedback, setFeedback] = useState<SaveFeedback>();
  const [isSaving, setIsSaving] = useState(false);
  const isDirty = !sameIds(draftIncludedIds, serverIncludedIds);
  const allSelected =
    features.length > 0 &&
    features.every((feature) => draftIncludedIds.has(feature.id));
  const someSelected = features.some((feature) =>
    draftIncludedIds.has(feature.id),
  );

  useEffect(() => {
    setDraftIncludedIds((current) =>
      sameIds(current, previousServerIds.current)
        ? serverIncludedIds
        : current,
    );
    previousServerIds.current = serverIncludedIds;
  }, [serverIncludedIds, serverSignature]);

  function replaceDraft(next: ReadonlySet<string>) {
    setFeedback(undefined);
    setDraftIncludedIds(next);
  }

  async function saveMembership() {
    const changedFeatures = features.filter(
      (feature) =>
        draftIncludedIds.has(feature.id) !==
        feature.includeInProjectContext,
    );

    if (changedFeatures.length === 0) return;

    setFeedback(undefined);
    setIsSaving(true);

    try {
      const results = await Promise.allSettled(
        changedFeatures.map((feature) =>
          updateFeatureMutation.mutateAsync({
            featureId: feature.id,
            includeInProjectContext: draftIncludedIds.has(feature.id),
          }),
        ),
      );
      const failedResults = results.filter(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected',
      );

      // TODO(project-context): request ProjectContextSummary recalculation here
      // once its backend update contract and overwrite semantics are defined.
      if (failedResults.length > 0) {
        setFeedback({
          kind: 'error',
          message: getApiErrorMessage(
            failedResults[0].reason,
            failedResults.length === 1
              ? 'One feature could not be updated. Your remaining change is still selected.'
              : `${failedResults.length} features could not be updated. Their changes remain selected.`,
          ),
        });
      } else {
        setFeedback({
          kind: 'success',
          message: 'Project context membership saved.',
        });
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={styles.contextLayout}>
      <section
        aria-labelledby='project-context-editor-title'
        className={styles.contextPlaceholder}
      >
        <span aria-hidden='true' className={styles.contextIcon}>
          <Sparkles size={22} strokeWidth={1.75} />
        </span>
        <div>
          <p className='fw-overline'>Coming later</p>
          <h2 id='project-context-editor-title'>Project context editor</h2>
          <p>
            Loading, manually editing, and recalculating the generated project
            context will be added when its backend workflow is defined.
          </p>
        </div>
      </section>

      <aside
        aria-labelledby='context-membership-title'
        className={styles.contextSidebar}
      >
        <div className={styles.sidebarHeading}>
          <h2 id='context-membership-title'>Features in project context</h2>
          <p>
            Choose which features contribute knowledge to the future project
            summary.
          </p>
        </div>

        <fieldset className={styles.checkboxGroup} disabled={isSaving}>
          <legend className={styles.srOnly}>Project context membership</legend>
          <div className={styles.selectAll}>
            <Checkbox
              checked={allSelected}
              disabled={features.length === 0 || isSaving}
              indeterminate={someSelected && !allSelected}
              label='Select all features'
              labelWeight='medium'
              onChange={(event) => {
                replaceDraft(
                  event.currentTarget.checked
                    ? new Set(features.map((feature) => feature.id))
                    : new Set(),
                );
              }}
            />
          </div>
          {features.length === 0 ? (
            <p className={styles.emptyMembership}>No features to select.</p>
          ) : (
            <div className={styles.checkboxList}>
              {features.map((feature) => (
                <Checkbox
                  checked={draftIncludedIds.has(feature.id)}
                  disabled={isSaving}
                  key={feature.id}
                  label={feature.title}
                  onChange={(event) => {
                    const next = new Set(draftIncludedIds);
                    if (event.currentTarget.checked) {
                      next.add(feature.id);
                    } else {
                      next.delete(feature.id);
                    }
                    replaceDraft(next);
                  }}
                />
              ))}
            </div>
          )}
        </fieldset>

        <div className={styles.saveArea}>
          {feedback ? (
            <p
              className={
                feedback.kind === 'error'
                  ? styles.errorFeedback
                  : styles.successFeedback
              }
              role={feedback.kind === 'error' ? 'alert' : 'status'}
            >
              {feedback.message}
            </p>
          ) : null}
          <Button
            disabled={!isDirty || isSaving}
            loading={isSaving}
            onClick={() => void saveMembership()}
          >
            Save selection
          </Button>
        </div>
      </aside>
    </div>
  );
}

interface ProjectContentProps {
  readonly accessToken: string;
  readonly organizationId: string;
  readonly projectId: string;
  readonly projectKey: string;
}

function ProjectContent({
  accessToken,
  organizationId,
  projectId,
  projectKey,
}: ProjectContentProps) {
  const projectQuery = useProject(accessToken, organizationId, projectKey);
  const featuresQuery = useProjectFeatures(
    accessToken,
    projectId,
    projectKey,
  );
  const { openEdit: openEditProject } = useProjectActions();
  const featureActions = useFeatureActions();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab: ProjectTabId = isProjectTabId(requestedTab)
    ? requestedTab
    : 'features';
  const projectNotFound = projectQuery.isError && isNotFound(projectQuery.error);
  useCanonicalPath(
    projectQuery.data
      ? getProjectPath(projectQuery.data.publicKey)
      : undefined,
  );
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
                featureActions.openCreate({ projectId: projectQuery.data.id })
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
          ? 'Review feature readiness, activity, and project context membership.'
          : 'Choose which features contribute to the project context.'
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
          <ProjectContextPanel
            accessToken={accessToken}
            features={featuresQuery.data}
          />
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
      organizationId={user.organizationId}
      projectId={user.projectId}
      projectKey={projectKey}
    />
  );
}
