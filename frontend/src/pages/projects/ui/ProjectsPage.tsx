import { useQueryClient } from '@tanstack/react-query';
import { FolderKanban } from 'lucide-react';
import { useCallback } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/features/auth';
import { projectFeaturesQueryOptions } from '@/features/features';
import { useProjects } from '@/features/workspace';
import { Button } from '@/shared/ui/button';

import styles from './ProjectsPage.module.css';

interface ProjectsContentProps {
  readonly accessToken: string;
  readonly organizationId: string;
}

function ProjectsContent({
  accessToken,
  organizationId,
}: ProjectsContentProps) {
  const projectsQuery = useProjects(accessToken, organizationId);
  const queryClient = useQueryClient();
  const prefetchFeatures = useCallback(
    (projectId: string) => {
      void queryClient.prefetchQuery(
        projectFeaturesQueryOptions(accessToken, projectId),
      );
    },
    [accessToken, queryClient],
  );

  return (
    <section className={styles.page} aria-labelledby="projects-title">
      <div className={styles.heading}>
        <p className="fw-overline">Workspace</p>
        <h1 id="projects-title">Projects</h1>
        <p>Choose a project to browse its features.</p>
      </div>

      {projectsQuery.isPending ? (
        <p className={styles.status} role="status">
          Loading projects...
        </p>
      ) : projectsQuery.isError ? (
        <div className={styles.status} role="alert">
          <p>Projects could not be loaded.</p>
          <Button onClick={() => void projectsQuery.refetch()} size="small">
            Retry
          </Button>
        </div>
      ) : projectsQuery.data.length === 0 ? (
        <p className={styles.status} role="status">
          No projects yet.
        </p>
      ) : (
        <ul className={styles.list}>
          {projectsQuery.data.map((project) => (
            <li key={project.id}>
              <Link
                className={styles.link}
                onFocus={() => prefetchFeatures(project.id)}
                onPointerEnter={() => prefetchFeatures(project.id)}
                to={`/projects/${project.id}`}
              >
                <FolderKanban
                  aria-hidden="true"
                  size={18}
                  strokeWidth={1.75}
                />
                <span>{project.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ProjectsPage() {
  const { accessToken, user } = useAuth();

  if (!accessToken || !user) return null;

  return (
    <ProjectsContent
      accessToken={accessToken}
      organizationId={user.organizationId}
    />
  );
}
