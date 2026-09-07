import { ExternalLink, GitBranch, RefreshCw, Unplug } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ApiError } from '@/shared/api';
import { getApiErrorMessage } from '@/shared/api';
import { githubConnectionError } from '../lib/github-connection-error';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { ConfirmModal } from '@/shared/ui/confirm-modal';
import { Select } from '@/shared/ui/select';

import {
  flattenBranchPages,
  flattenRepositoryPages,
  useAvailableRepositories,
  useBranches,
  useProjectRepository,
  useRepositoryMutations,
} from '../model';
import styles from './RepositoryPanels.module.css';

export function ProjectRepositoryPanel({
  accessToken,
  projectKey,
}: {
  readonly accessToken: string;
  readonly projectKey: string;
}) {
  const query = useProjectRepository(accessToken, projectKey);
  const mutations = useRepositoryMutations(accessToken, projectKey);
  const state = query.data?.state;
  const connection = query.data?.connection;
  const [searchParams, setSearchParams] = useSearchParams();
  const [actionError, setActionError] = useState<string | null>(null);
  const attemptScope = query.data?.attemptExpiresAt ?? state ?? '';
  const [accountDraft, setAccountDraft] = useState({ scope: '', value: '' });
  const installations = query.data?.installations ?? [];
  const installationId =
    accountDraft.scope === attemptScope
      ? accountDraft.value
      : installations.length === 1
        ? installations[0].installationId
        : '';
  const available = useAvailableRepositories(
    accessToken,
    projectKey,
    state === 'repository_selection' &&
      (installations.length <= 1 || Boolean(installationId)),
    installationId || undefined,
    attemptScope,
  );
  const branches = useBranches(
    accessToken,
    projectKey,
    connection?.publicKey ?? '',
    Boolean(connection),
  );
  const repositoryScope = `${attemptScope}:${installationId}`;
  const [repositoryDraft, setRepositoryDraft] = useState({
    scope: '',
    value: '',
  });
  const repositoryId =
    repositoryDraft.scope === repositoryScope ? repositoryDraft.value : '';
  const setRepositoryId = (value: string) =>
    setRepositoryDraft({ scope: repositoryScope, value });
  const branchScope = `${connection?.publicKey ?? ''}:${connection?.baseBranch ?? ''}`;
  const [branchDraft, setBranchDraft] = useState({ scope: '', value: '' });
  const baseBranch = branchDraft.scope === branchScope ? branchDraft.value : '';
  const setBaseBranch = (value: string) =>
    setBranchDraft({ scope: branchScope, value });
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [impact, setImpact] = useState<{
    readonly message: string;
    readonly items: readonly string[];
  } | null>(null);
  const repositoryOptions = useMemo(
    () =>
      flattenRepositoryPages(available.data?.pages).map((repository) => ({
        label: `${repository.fullName}${repository.private ? ' · Private' : ''}`,
        value: repository.repositoryId,
      })),
    [available.data?.pages],
  );
  const branchOptions = useMemo(
    () =>
      flattenBranchPages(branches.data?.pages).map((branch) => ({
        label: branch.name,
        value: branch.name,
      })),
    [branches.data?.pages],
  );

  const errorMessage =
    actionError ?? githubConnectionError(searchParams.get('githubError'));
  function clearError() {
    setActionError(null);
    if (searchParams.has('githubError')) {
      const next = new URLSearchParams(searchParams);
      next.delete('githubError');
      setSearchParams(next, { replace: true });
    }
  }
  async function startConnection() {
    clearError();
    try {
      const { redirectUrl } = await mutations.attempt.mutateAsync('authorize');
      window.location.assign(redirectUrl);
    } catch (error) {
      setActionError(
        getApiErrorMessage(
          error,
          'Could not start the GitHub connection. Please try again.',
        ),
      );
    }
  }
  async function cancelConnection() {
    clearError();
    try {
      await mutations.cancelAttempt.mutateAsync();
    } catch (error) {
      setActionError(
        getApiErrorMessage(
          error,
          'Could not cancel the connection. Please try again.',
        ),
      );
    }
  }
  const appAccessLink = (
    <a
      className={styles.appAccessLink}
      href={query.data?.githubAppAccessUrl ?? 'https://github.com/settings/installations'}
      target='_blank'
      rel='noopener noreferrer'
    >
      Install or manage GitHub App access
      <ExternalLink size={16} strokeWidth={1.75} aria-hidden='true' />
    </a>
  );
  const connectionActions = (
    <>
      {errorMessage ? <p role='alert'>{errorMessage}</p> : null}
      <div className={styles.connectionActions}>
        <Button
          leadingIcon={<GitBranch aria-hidden='true' size={16} />}
          loading={mutations.attempt.isPending}
          onClick={() => void startConnection()}
        >
          {state === 'disconnected' ? 'Connect GitHub' : 'Continue with GitHub'}
        </Button>
        {appAccessLink}
        {state !== 'disconnected' ? (
          <Button
            variant='secondary'
            loading={mutations.cancelAttempt.isPending}
            onClick={() => void cancelConnection()}
          >
            Cancel connection
          </Button>
        ) : null}
      </div>
    </>
  );

  if (query.isPending)
    return <p role='status'>Loading repository integration...</p>;
  if (query.isError)
    return (
      <div role='alert' className={styles.status}>
        <p>Repository integration could not be loaded.</p>
        <Button onClick={() => void query.refetch()}>Retry</Button>
      </div>
    );
  if (state === 'integration_disabled')
    return (
      <EmptyState title='GitHub integration is disabled'>
        Set `GITHUB_ENABLED=true` and configure the GitHub App to connect a
        repository.
        {appAccessLink}
      </EmptyState>
    );
  if (state === 'connecting')
    return (
      <EmptyState title='Connecting to GitHub'>
        <p>
          If GitHub left you on the App settings page, return here and select
          Continue with GitHub to authorize the installed App. You can also
          cancel and start again.
        </p>
        {connectionActions}
      </EmptyState>
    );
  if (state === 'disconnected')
    return (
      <EmptyState title='Connect a GitHub repository'>
        Featurewise uses read-only Contents access and never stores GitHub
        tokens.
        {connectionActions}
      </EmptyState>
    );
  if (state === 'repository_selection')
    return (
      <Card className={`${styles.card} ${styles.setupCard}`} width='100%'>
        <h2>Select a repository</h2>
        <p>
          The installation was verified. Choose one repository for this Project.
        </p>
        {installations.length > 1 ? (
          <Select
            label='GitHub account'
            options={installations.map((item) => ({
              value: item.installationId,
              label: item.accountLogin,
            }))}
            value={installationId}
            placeholder='Select an account or organization'
            onChange={(value) =>
              setAccountDraft({ scope: attemptScope, value })
            }
          />
        ) : null}
        {available.isError ? (
          <p role='alert'>
            Repositories could not be loaded.{' '}
            <Button
              variant='secondary'
              onClick={() => void available.refetch()}
            >
              Retry loading repositories
            </Button>
          </p>
        ) : null}
        {!available.isPending &&
        !available.isError &&
        repositoryOptions.length === 0 ? (
          <p>
            No repositories are available. Manage the GitHub App installation
            to grant repository access, then reconnect GitHub.
          </p>
        ) : null}
        <Select
          label='Repository'
          disabled={
            available.isPending ||
            available.isError ||
            (installations.length > 1 && !installationId)
          }
          options={repositoryOptions}
          value={repositoryId}
          onChange={setRepositoryId}
          placeholder={
            installations.length > 1 && !installationId
              ? 'Select a GitHub account first'
              : available.isPending
                ? 'Loading repositories...'
                : 'Select repository'
          }
        />
        {available.hasNextPage ? (
          <Button
            variant='secondary'
            loading={available.isFetchingNextPage}
            onClick={() => void available.fetchNextPage()}
          >
            Load more repositories
          </Button>
        ) : null}
        <div className={styles.connectionActions}>
          <Button
            disabled={!repositoryId || available.isError}
            loading={mutations.connect.isPending}
            onClick={() =>
              mutations.connect.mutate({
                repositoryId,
                installationId: installationId || undefined,
              })
            }
          >
            Connect repository
          </Button>
          {appAccessLink}
        </div>
        {mutations.connect.isError ? (
          <p role='alert'>
            {getApiErrorMessage(
              mutations.connect.error,
              'Could not connect the repository. Please try again.',
            )}
          </p>
        ) : null}
      </Card>
    );
  if (!connection) return null;

  async function saveBranch() {
    setImpact(null);
    try {
      await mutations.updateBranch.mutateAsync(
        baseBranch || connection?.baseBranch || '',
      );
    } catch (error) {
      setImpact(
        error instanceof ApiError && error.status === 409
          ? parseProjectBranchImpact(error)
          : { message: 'The base branch could not be changed.', items: [] },
      );
    }
  }

  return (
    <div className={styles.stack}>
      {state === 'inaccessible' ? (
        <div className={styles.alert} role='alert'>
          This repository is no longer accessible to the GitHub App.
        </div>
      ) : null}
      {state === 'rate_limited' ? (
        <div className={styles.alert} role='alert'>
          GitHub rate limit reached. Retry after the displayed reset time.
        </div>
      ) : null}
      <Card className={styles.card} width='100%'>
        <div className={styles.heading}>
          <div>
            <p className='fw-overline'>Connected repository</p>
            <h2>{connection.fullName}</h2>
          </div>
          <span>{connection.private ? 'Private' : 'Public'}</span>
        </div>
        <dl className={styles.metadata}>
          <div>
            <dt>Default branch</dt>
            <dd>{connection.defaultBranch}</dd>
          </div>
          <div>
            <dt>Base branch</dt>
            <dd>{connection.baseBranch}</dd>
          </div>
          <div>
            <dt>Last checked</dt>
            <dd>
              {connection.lastCheckedAt
                ? new Date(connection.lastCheckedAt).toLocaleString()
                : 'Not checked'}
            </dd>
          </div>
          {connection.rateLimitResetAt ? (
            <div>
              <dt>Rate limit resets</dt>
              <dd>{new Date(connection.rateLimitResetAt).toLocaleString()}</dd>
            </div>
          ) : null}
          {connection.lastErrorMessage ? (
            <div>
              <dt>Last error</dt>
              <dd>{connection.lastErrorMessage}</dd>
            </div>
          ) : null}
        </dl>
        <Select
          label='Project base branch'
          options={branchOptions}
          value={baseBranch || connection.baseBranch}
          onChange={setBaseBranch}
        />
        {branches.hasNextPage ? (
          <Button
            variant='secondary'
            loading={branches.isFetchingNextPage}
            onClick={() => void branches.fetchNextPage()}
          >
            Load more branches
          </Button>
        ) : null}
        {impact ? (
          <div className={styles.alert} role='alert'>
            <p>{impact.message}</p>
            {impact.items.length ? (
              <ul>
                {impact.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        <div className={styles.actions}>
          {appAccessLink}
          <Button
            variant='secondary'
            leadingIcon={<RefreshCw size={16} />}
            onClick={() => void query.refetch()}
          >
            Refresh
          </Button>
          <Button
            disabled={
              (baseBranch || connection.baseBranch) === connection.baseBranch
            }
            loading={mutations.updateBranch.isPending}
            onClick={() => void saveBranch()}
          >
            Save branch
          </Button>
          <Button
            variant='danger'
            leadingIcon={<Unplug size={16} />}
            onClick={() => setDisconnectOpen(true)}
          >
            Disconnect
          </Button>
        </div>
      </Card>
      <ConfirmModal
        open={disconnectOpen}
        onOpenChange={setDisconnectOpen}
        title='Disconnect repository?'
        description='Current Feature branch overrides and selected paths will be deleted. The GitHub App will not be uninstalled and historical snapshots remain unchanged.'
        confirmLabel='Disconnect repository'
        variant='danger'
        pending={mutations.disconnect.isPending}
        onConfirm={() =>
          void mutations.disconnect
            .mutateAsync()
            .then(() => setDisconnectOpen(false))
        }
      />
    </div>
  );
}

function EmptyState({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <Card className={styles.empty} width='100%'>
      <GitBranch aria-hidden='true' size={24} />
      <h2>{title}</h2>
      <div className={styles.emptyBody}>{children}</div>
    </Card>
  );
}

function parseProjectBranchImpact(error: ApiError) {
  const body = isRecord(error.details) ? error.details : {};
  const details = isRecord(body.details) ? body.details : {};
  const features = Array.isArray(details.features) ? details.features : [];
  const items = features.flatMap((candidate) => {
    if (
      !isRecord(candidate) ||
      typeof candidate.featureKey !== 'string' ||
      !Array.isArray(candidate.paths)
    )
      return [];
    return candidate.paths.flatMap((path) =>
      isRecord(path) && typeof path.path === 'string'
        ? [`${candidate.featureKey}: ${path.path}`]
        : [],
    );
  });
  return {
    message:
      'This branch would make selected Feature files unavailable. No changes were saved.',
    items,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
