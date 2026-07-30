import {
  FileText,
  FolderClosed,
  FolderKanban,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '@/features/auth';
import { useFeatureActions, useProjectFeatures } from '@/features/features';
import { useProject, useProjectActions } from '@/features/workspace';
import { ApiError } from '@/shared/api';
import { usePageHeaderRegistration } from '@/shared/model';
import { Breadcrumb } from '@/shared/ui/breadcrumb';
import { Button } from '@/shared/ui/button';
import { MenuItem } from '@/shared/ui/menu';
import { MenuPopover } from '@/shared/ui/menu-popover';

import styles from './ProjectPage.module.css';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isNotFound(error: unknown) {
  return (
    error instanceof ApiError &&
    (error.status === 400 || error.status === 404)
  );
}

interface ProjectContentProps {
  readonly accessToken: string;
  readonly organizationId: string;
  readonly projectId: string;
}

function ProjectContent({
  accessToken,
  organizationId,
  projectId,
}: ProjectContentProps) {
  const projectQuery = useProject(
    accessToken,
    organizationId,
    projectId,
  );
  const featuresQuery = useProjectFeatures(accessToken, projectId);
  const { openEdit: openEditProject } = useProjectActions();
  const featureActions = useFeatureActions();
  const projectNotFound =
    projectQuery.isError && isNotFound(projectQuery.error);
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
          <Button
            leadingIcon={<Plus size={16} strokeWidth={1.75} />}
            onClick={() => featureActions.openCreate({ projectId })}
          >
            Add feature
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
              label: projectNotFound
                ? 'Project not found'
                : projectQuery.data?.name ?? 'Project',
            },
          ]}
          titleId='project-title'
        />
      ),
      subtitle: projectQuery.data
        ? 'Choose a feature to open its workspace.'
        : undefined,
    }),
    [
      featureActions,
      openEditProject,
      projectId,
      projectNotFound,
      projectQuery.data,
    ],
  );
  usePageHeaderRegistration(pageHeader);

  if (projectQuery.isPending) {
    return <p className={styles.status}>Loading project...</p>;
  }

  if (projectQuery.isError) {
    if (isNotFound(projectQuery.error)) {
      return (
        <section className={styles.page}>
          <p className="fw-overline">404</p>
          <p className={styles.status}>
            This project does not exist or is not available.
          </p>
        </section>
      );
    }

    return (
      <div className={styles.status} role="alert">
        <p>The project could not be loaded.</p>
        <Button onClick={() => void projectQuery.refetch()} size="small">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <section className={styles.page} aria-labelledby="project-title">
      {featuresQuery.isPending ? (
        <p className={styles.status} role="status">
          Loading features...
        </p>
      ) : featuresQuery.isError ? (
        <div className={styles.status} role="alert">
          <p>Features could not be loaded.</p>
          <Button onClick={() => void featuresQuery.refetch()} size="small">
            Retry
          </Button>
        </div>
      ) : featuresQuery.data.length === 0 ? (
        <p className={styles.status} role="status">
          No features yet.
        </p>
      ) : (
        <ul className={styles.list}>
          {featuresQuery.data.map((feature) => (
            <li className={styles.row} key={feature.id}>
              <Link
                className={styles.link}
                to={`/projects/${projectId}/features/${feature.id}`}
              >
                <FileText
                  aria-hidden="true"
                  size={18}
                  strokeWidth={1.75}
                />
                <span>{feature.title}</span>
              </Link>
              <MenuPopover label={`Open ${feature.title} row menu`}>
                <MenuItem
                  leadingIcon={<Pencil size={16} strokeWidth={1.75} />}
                  onClick={() => featureActions.openEdit(feature)}
                >
                  Edit feature
                </MenuItem>
                <MenuItem
                  leadingIcon={<Trash2 size={16} strokeWidth={1.75} />}
                  onClick={() => featureActions.openDelete(feature)}
                  variant='danger'
                >
                  Delete feature
                </MenuItem>
              </MenuPopover>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ProjectPage() {
  const { accessToken, user } = useAuth();
  const { projectId } = useParams();

  if (!projectId || !UUID_PATTERN.test(projectId)) {
    return (
      <section className={styles.page}>
        <p className="fw-overline">404</p>
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
      projectId={projectId}
    />
  );
}
