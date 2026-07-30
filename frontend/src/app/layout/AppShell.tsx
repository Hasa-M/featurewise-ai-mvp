import { useQueries, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Pencil,
  LoaderCircle,
  LogOut,
  Trash2,
  UserRound,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { matchPath, Outlet, useLocation } from 'react-router-dom';

import { RouterNavigationLink } from '@/app/router/RouterNavigationLink';
import { useAuth } from '@/features/auth';
import {
  projectFeaturesQueryOptions,
  useFeatureActions,
  type Feature,
} from '@/features/features';
import {
  useOrganization,
  useProjectActions,
  useProjects,
  type Organization,
  type Project,
} from '@/features/workspace';
import { useRegisteredPageHeader } from '@/shared/model';
import { Button } from '@/shared/ui/button';
import type { HeaderProps } from '@/shared/ui/header';
import { MenuItem, MenuSection, MenuWrapper } from '@/shared/ui/menu';
import { PageStructure } from '@/shared/ui/page-structure';
import type {
  SidebarGroupItem,
  SidebarNodeItem,
} from '@/shared/ui/sidebar';
import { TextInput } from '@/shared/ui/text-input';

import styles from './AppShell.module.css';

function OrganizationMark() {
  return (
    <span aria-hidden="true" className={styles.organizationMark}>
      <Building2 size={15} strokeWidth={1.75} />
    </span>
  );
}

interface UserMenuProps {
  readonly onLogout: () => void;
  readonly username: string;
}

function UserMenu({ onLogout, username }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback((restoreFocus = false) => {
    setIsOpen(false);
    if (restoreFocus) {
      rootRef.current
        ?.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')
        ?.focus();
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    rootRef.current
      ?.querySelector<HTMLElement>('[role="menuitem"]')
      ?.focus();

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        closeMenu();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [closeMenu, isOpen]);

  return (
    <div className={styles.userMenuRoot} ref={rootRef}>
      <Button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Open user menu"
        className={styles.userButton}
        isIcon
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !isOpen) {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
        size="small"
        title="Open user menu"
        variant="ghost"
      >
        <UserRound aria-hidden="true" size={17} strokeWidth={1.75} />
      </Button>

      {isOpen ? (
        <div className={styles.userMenuPanel}>
          <MenuWrapper
            aria-label="User menu"
            id={menuId}
            onEscape={() => closeMenu(true)}
          >
            <MenuSection title={username}>
              <MenuItem
                leadingIcon={<LogOut size={16} strokeWidth={1.75} />}
                onClick={() => {
                  closeMenu();
                  onLogout();
                }}
                variant="danger"
              >
                Log out
              </MenuItem>
            </MenuSection>
          </MenuWrapper>
        </div>
      ) : null}
    </div>
  );
}

interface WorkspaceHeaderOptions {
  readonly onLogout: () => void;
  readonly organization: Organization;
  readonly updateName: (name: string) => Promise<Organization>;
  readonly username: string;
}

function useWorkspaceHeader({
  onLogout,
  organization,
  updateName,
  username,
}: WorkspaceHeaderOptions): HeaderProps {
  const [isOpen, setIsOpen] = useState(false);
  const [draftName, setDraftName] = useState(organization.name);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDraftName(organization.name);
      setErrorMessage(null);
    }
    setIsOpen(nextOpen);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draftName.trim();

    if (!name) {
      setErrorMessage('Enter an organization name.');
      return;
    }

    if (name.length > 120) {
      setErrorMessage('Use 120 characters or fewer.');
      return;
    }

    setErrorMessage(null);
    setIsSaving(true);

    try {
      await updateName(name);
      setIsOpen(false);
    } catch {
      setErrorMessage('The organization name could not be saved.');
    } finally {
      setIsSaving(false);
    }
  }

  return {
    dropdownCardProps: {
      children: (
        <form className={styles.organizationPanel} onSubmit={handleSubmit}>
          <div className={styles.organizationHeading}>
            <OrganizationMark />
            <div>
              <h2>Organization settings</h2>
              <p>Update the name shown across your workspace.</p>
            </div>
          </div>

          <TextInput
            autoComplete="organization"
            disabled={isSaving}
            errorMessage={errorMessage}
            label="Organization name"
            maxLength={120}
            onChange={(event) => {
              setDraftName(event.currentTarget.value);
              if (errorMessage) setErrorMessage(null);
            }}
            value={draftName}
          />

          <div className={styles.organizationActions}>
            <Button
              disabled={isSaving}
              onClick={() => handleOpenChange(false)}
              size="small"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              disabled={draftName.trim() === organization.name}
              loading={isSaving}
              size="small"
              type="submit"
            >
              Save changes
            </Button>
          </div>
        </form>
      ),
      label: organization.name,
      leadingVisual: <OrganizationMark />,
      onOpenChange: handleOpenChange,
      open: isOpen,
      panelLabel: 'Organization settings',
    },
    homeHref: '/',
    userControl: <UserMenu onLogout={onLogout} username={username} />,
  };
}

interface ShellStatusProps {
  readonly errorMessage?: string | null;
  readonly onRetry?: () => void;
}

function ShellStatus({ errorMessage, onRetry }: ShellStatusProps) {
  if (errorMessage) {
    return (
      <main className={styles.statusPage}>
        <div className={styles.statusCard} role="alert">
          <Building2 aria-hidden="true" size={22} strokeWidth={1.75} />
          <h1>Workspace unavailable</h1>
          <p>{errorMessage}</p>
          <Button onClick={onRetry} size="small">
            Retry
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.statusPage}>
      <div className={styles.loadingStatus} role="status">
        <LoaderCircle
          aria-hidden="true"
          className={styles.spinner}
          size={18}
          strokeWidth={1.75}
        />
        Loading workspace...
      </div>
    </main>
  );
}

function activeSidebarItem(pathname: string): string {
  const featureMatch = matchPath(
    '/projects/:projectId/features/:featureId',
    pathname,
  );
  if (featureMatch?.params.featureId) {
    return `feature:${featureMatch.params.featureId}`;
  }

  const projectMatch = matchPath('/projects/:projectId', pathname);
  if (projectMatch?.params.projectId) {
    return `project:${projectMatch.params.projectId}`;
  }

  return pathname === '/' ? 'projects' : '';
}

function featureGroups(
  projectId: string,
  features: readonly Feature[] | undefined,
  onDelete: (feature: Feature) => void,
  onEdit: (feature: Feature) => void,
): readonly SidebarGroupItem[] {
  return (features ?? []).map((feature) => ({
    children: [],
    emptyMessage: 'No feature sections yet',
    id: `feature:${feature.id}`,
    label: feature.title,
    menuContent: {
      'aria-label': `Open ${feature.title} menu`,
      children: (
        <>
          <MenuItem
            leadingIcon={<Pencil size={16} strokeWidth={1.75} />}
            onClick={() => onEdit(feature)}
          >
            Edit feature
          </MenuItem>
          <MenuItem
            leadingIcon={<Trash2 size={16} strokeWidth={1.75} />}
            onClick={() => onDelete(feature)}
            variant="danger"
          >
            Delete feature
          </MenuItem>
        </>
      ),
    },
    pageAction: {
      'aria-label': `Go to ${feature.title}`,
      href: `/projects/${projectId}/features/${feature.id}`,
      title: `Go to ${feature.title}`,
    },
    type: 'group',
  }));
}

interface ReadyShellProps {
  readonly accessToken: string;
  readonly onLogout: () => void;
  readonly organization: Organization;
  readonly projects?: readonly Project[];
  readonly projectsError: boolean;
  readonly projectsPending: boolean;
  readonly updateName: (name: string) => Promise<Organization>;
  readonly username: string;
}

function ReadyShell({
  accessToken,
  onLogout,
  organization,
  projects = [],
  projectsError,
  projectsPending,
  updateName,
  username,
}: ReadyShellProps) {
  const [expandedProjects, setExpandedProjects] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const location = useLocation();
  const queryClient = useQueryClient();
  const pageHeaderProps = useRegisteredPageHeader();
  const { openEdit: openEditProject } = useProjectActions();
  const featureActions = useFeatureActions();
  const headerProps = useWorkspaceHeader({
    onLogout,
    organization,
    updateName,
    username,
  });
  const featureQueries = useQueries({
    queries: projects.map((project) => ({
      ...projectFeaturesQueryOptions(accessToken, project.id),
      enabled: expandedProjects.has(project.id),
    })),
  });

  const prefetchFeatures = useCallback(
    (projectId: string) => {
      void queryClient.prefetchQuery(
        projectFeaturesQueryOptions(accessToken, projectId),
      );
    },
    [accessToken, queryClient],
  );

  const sidebarNodes = useMemo<readonly SidebarNodeItem[]>(() => {
    const projectGroups: readonly SidebarGroupItem[] = projects.map(
      (project, index) => {
        const featureQuery = featureQueries[index];
        const emptyMessage = featureQuery?.isError
          ? 'Features unavailable. Open the project page to retry.'
          : featureQuery?.isPending
            ? 'Loading features...'
            : 'No features yet';

        return {
          children: [
            {
              addAction: {
                'aria-label': `Add feature to ${project.name}`,
                onClick: () => featureActions.openCreate({ projectId: project.id }),
                title: `Add feature to ${project.name}`,
              },
              children: featureGroups(
                project.id,
                featureQuery?.data,
                featureActions.openDelete,
                featureActions.openEdit,
              ),
              emptyMessage,
              id: `features:${project.id}`,
              label: 'Features',
              type: 'node',
            },
          ],
          id: `project:${project.id}`,
          label: project.name,
          menuContent: {
            'aria-label': `Open ${project.name} menu`,
            children: (
              <MenuItem
                leadingIcon={<Pencil size={16} strokeWidth={1.75} />}
                onClick={() => openEditProject(project)}
              >
                Edit project
              </MenuItem>
            ),
          },
          pageAction: {
            'aria-label': `Go to ${project.name}`,
            href: `/projects/${project.id}`,
            onFocus: () => prefetchFeatures(project.id),
            onPointerEnter: () => prefetchFeatures(project.id),
            title: `Go to ${project.name}`,
          },
          type: 'group',
        };
      },
    );

    return [
      {
        children: projectGroups,
        emptyMessage: projectsError
          ? 'Projects unavailable. Open Projects to retry.'
          : projectsPending
            ? 'Loading projects...'
            : 'No projects yet',
        id: 'projects',
        label: 'Projects',
        listAction: {
          'aria-label': 'Go to Projects',
          href: '/',
          title: 'Go to Projects',
        },
        type: 'node',
      },
    ];
  }, [
    featureQueries,
    featureActions,
    openEditProject,
    prefetchFeatures,
    projects,
    projectsError,
    projectsPending,
  ]);

  const handleItemOpenChange = useCallback((itemId: string, open: boolean) => {
    if (!itemId.startsWith('project:')) return;
    const projectId = itemId.slice('project:'.length);

    setExpandedProjects((current) => {
      const next = new Set(current);
      if (open) {
        next.add(projectId);
      } else {
        next.delete(projectId);
      }
      return next;
    });
  }, []);

  return (
    <PageStructure
      headerProps={headerProps}
      linkComponent={RouterNavigationLink}
      pageHeaderProps={pageHeaderProps}
      sidebarProps={{
        activeItemId: activeSidebarItem(location.pathname),
        nodes: sidebarNodes,
        onItemOpenChange: handleItemOpenChange,
      }}
    >
      <Outlet />
    </PageStructure>
  );
}

export function AppShell() {
  const { accessToken, signOut, user } = useAuth();

  if (!accessToken || !user) {
    return <ShellStatus />;
  }

  return (
    <AuthenticatedShell
      accessToken={accessToken}
      onLogout={signOut}
      organizationId={user.organizationId}
      username={user.username}
    />
  );
}

interface AuthenticatedShellProps {
  readonly accessToken: string;
  readonly onLogout: () => void;
  readonly organizationId: string;
  readonly username: string;
}

function AuthenticatedShell({
  accessToken,
  onLogout,
  organizationId,
  username,
}: AuthenticatedShellProps) {
  const organizationQuery = useOrganization(accessToken, organizationId);
  const projectsQuery = useProjects(accessToken, organizationId);

  if (organizationQuery.status === 'loading' || !organizationQuery.organization) {
    if (organizationQuery.status === 'error') {
      return (
        <ShellStatus
          errorMessage={organizationQuery.errorMessage}
          onRetry={() => void organizationQuery.retry()}
        />
      );
    }

    return <ShellStatus />;
  }

  return (
    <ReadyShell
      accessToken={accessToken}
      onLogout={onLogout}
      organization={organizationQuery.organization}
      projects={projectsQuery.data}
      projectsError={projectsQuery.isError}
      projectsPending={projectsQuery.isPending}
      updateName={organizationQuery.updateName}
      username={username}
    />
  );
}
