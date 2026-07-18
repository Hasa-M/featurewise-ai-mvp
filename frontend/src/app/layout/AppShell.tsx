import {
  Building2,
  LoaderCircle,
  LogOut,
  UserRound,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { Outlet } from 'react-router-dom';

import { useAuth } from '@/features/auth';
import {
  useOrganization,
  type Organization,
} from '@/features/workspace';
import { Button } from '@/shared/ui/button';
import { Header } from '@/shared/ui/header';
import { MenuItem, MenuSection, MenuWrapper } from '@/shared/ui/menu';
import { TextInput } from '@/shared/ui/text-input';

import styles from './AppShell.module.css';

function OrganizationMark() {
  return (
    <span aria-hidden="true" className={styles.organizationMark}>
      <Building2 size={15} strokeWidth={1.75} />
    </span>
  );
}

interface WorkspaceHeaderProps {
  readonly onLogout: () => void;
  readonly organization: Organization;
  readonly updateName: (name: string) => Promise<Organization>;
  readonly username: string;
}

function WorkspaceHeader({
  onLogout,
  organization,
  updateName,
  username,
}: WorkspaceHeaderProps) {
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

  const organizationPanel = (
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
  );

  return (
    <Header
      dropdownCardProps={{
        children: organizationPanel,
        label: organization.name,
        leadingVisual: <OrganizationMark />,
        onOpenChange: handleOpenChange,
        open: isOpen,
        panelLabel: 'Organization settings',
      }}
      homeHref="/"
      userControl={<UserMenu onLogout={onLogout} username={username} />}
    />
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

export function AppShell() {
  const { accessToken, signOut, user } = useAuth();

  if (!accessToken || !user) {
    return <ShellStatus />;
  }

  return (
    <AuthenticatedShell
      accessToken={accessToken}
      organizationId={user.organizationId}
      onLogout={signOut}
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
  const { errorMessage, organization, retry, status, updateName } =
    useOrganization(accessToken, organizationId);

  if (status === 'loading' || !organization) {
    if (status === 'error') {
      return <ShellStatus errorMessage={errorMessage} onRetry={retry} />;
    }

    return <ShellStatus />;
  }

  return (
    <div className={styles.shell}>
      <WorkspaceHeader
        onLogout={onLogout}
        organization={organization}
        updateName={updateName}
        username={username}
      />
      <Outlet />
    </div>
  );
}
