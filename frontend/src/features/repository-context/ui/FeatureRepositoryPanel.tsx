import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronRight, File, Folder, X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { ApiError } from '@/shared/api';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
import { Radio, RadioGroup } from '@/shared/ui/radio-group';
import { Search } from '@/shared/ui/search';
import { Select } from '@/shared/ui/select';

import type { TreeItemDto } from '../api';
import {
  featureRepositoryContextSchema,
  type FeatureRepositoryContextForm,
} from '../lib/repository-context-form';
import {
  flattenBranchPages,
  flattenTreePages,
  useBranches,
  useFeatureRepositoryContext,
  useRepositoryTree,
  useUpdateFeatureRepositoryContext,
} from '../model';
import styles from './RepositoryPanels.module.css';

const EMPTY_LOADED_ITEMS: ReadonlyMap<string, TreeItemDto> = new Map();
const EMPTY_OPEN_PATHS: ReadonlySet<string> = new Set();

export function FeatureRepositoryPanel({
  accessToken,
  featureKey,
  projectKey,
}: {
  readonly accessToken: string;
  readonly featureKey: string;
  readonly projectKey: string;
}) {
  const context = useFeatureRepositoryContext(accessToken, featureKey);
  const repositoryKey = context.data?.repositoryKey ?? '';
  const branches = useBranches(
    accessToken,
    projectKey,
    repositoryKey,
    context.data?.state === 'connected',
  );
  const update = useUpdateFeatureRepositoryContext(accessToken, featureKey);
  const [loadedState, setLoadedState] = useState<{
    readonly scope: string;
    readonly commitSha: string;
    readonly items: ReadonlyMap<string, TreeItemDto>;
  }>({ scope: '', commitSha: '', items: EMPTY_LOADED_ITEMS });
  const [searchState, setSearchState] = useState<{
    readonly scope: string;
    readonly commitSha: string;
    readonly value: string;
  }>({ scope: '', commitSha: '', value: '' });
  const [impact, setImpact] = useState<{
    readonly message: string;
    readonly paths: readonly string[];
  } | null>(null);
  const form = useForm<FeatureRepositoryContextForm>({
    resolver: zodResolver(featureRepositoryContextSchema),
    defaultValues: {
      branchMode: 'inherit',
      branchOverride: '',
      selectedPaths: [],
    },
  });
  const branchMode = useWatch({ control: form.control, name: 'branchMode' });
  const branchOverride = useWatch({
    control: form.control,
    name: 'branchOverride',
  });
  const selectedPaths = useWatch({
    control: form.control,
    name: 'selectedPaths',
  });
  const effectiveBranch =
    branchMode === 'override'
      ? branchOverride
      : (context.data?.baseBranch ?? '');
  const metadataScope = `${repositoryKey}:${effectiveBranch}`;
  const loaded =
    loadedState.scope === metadataScope
      ? loadedState.items
      : EMPTY_LOADED_ITEMS;
  const loadedCommitSha =
    loadedState.scope === metadataScope ? loadedState.commitSha : '';
  const query =
    searchState.scope === metadataScope &&
    searchState.commitSha === loadedCommitSha
      ? searchState.value
      : '';
  const setQuery = (value: string) =>
    setSearchState({
      scope: metadataScope,
      commitSha: loadedCommitSha,
      value,
    });

  useEffect(() => {
    if (!context.data || context.data.state !== 'connected') return;
    form.reset({
      branchMode: context.data.branchOverride ? 'override' : 'inherit',
      branchOverride:
        context.data.branchOverride ?? context.data.baseBranch ?? '',
      selectedPaths:
        context.data.selectedFiles?.map((file) => file.path) ?? [],
    });
  }, [context.data, form]);

  const registerItems = useCallback(
    (commitSha: string, items: readonly TreeItemDto[], isRoot: boolean) => {
      setLoadedState((current) => {
        if (
          isRoot &&
          (current.scope !== metadataScope || current.commitSha !== commitSha)
        )
          return {
            scope: metadataScope,
            commitSha,
            items: new Map(items.map((item) => [item.path, item])),
          };
        if (
          current.scope !== metadataScope ||
          current.commitSha !== commitSha
        )
          return current;
        const next = new Map(current.items);
        let changed = false;
        for (const item of items) {
          if (!sameTreeItem(next.get(item.path), item)) {
            next.set(item.path, item);
            changed = true;
          }
        }
        return changed ? { ...current, items: next } : current;
      });
    },
    [metadataScope],
  );
  const loadedFiles = useMemo(
    () => [...loaded.values()].filter((item) => item.kind === 'file'),
    [loaded],
  );
  const matching = useMemo(
    () =>
      query.trim()
        ? loadedFiles.filter((item) =>
            item.path
              .toLocaleLowerCase()
              .includes(query.trim().toLocaleLowerCase()),
          )
        : [],
    [loadedFiles, query],
  );
  const selectedBytes = selectedPaths.reduce(
    (total, path) => total + (loaded.get(path)?.sizeBytes ?? 0),
    0,
  );
  const branchOptions = useMemo(
    () =>
      flattenBranchPages(branches.data?.pages).map((branch) => ({
        label: branch.name,
        value: branch.name,
      })),
    [branches.data?.pages],
  );

  if (context.isPending)
    return <p role='status'>Loading repository context...</p>;
  if (context.isError)
    return <p role='alert'>Repository context could not be loaded.</p>;
  if (context.data.state === 'integration_disabled')
    return <StatusCard title='GitHub integration is disabled' />;
  if (context.data.state === 'disconnected')
    return <StatusCard title='Connect a Project repository first' />;
  if (context.data.state !== 'connected')
    return <StatusCard title='Repository is currently unavailable' />;

  function togglePath(item: TreeItemDto, checked: boolean) {
    const current = form.getValues('selectedPaths');
    if (checked && !current.includes(item.path)) {
      const nextBytes = selectedBytes + (item.sizeBytes ?? 0);
      if (current.length >= 50 || nextBytes > 5 * 1024 * 1024) return;
    }
    form.setValue(
      'selectedPaths',
      checked
        ? [...current, item.path].sort()
        : current.filter((path) => path !== item.path),
      { shouldDirty: true, shouldValidate: true },
    );
  }

  async function submit(values: FeatureRepositoryContextForm) {
    setImpact(null);
    try {
      await update.mutateAsync({
        branchOverride:
          values.branchMode === 'override' ? values.branchOverride : null,
        selectedPaths: values.selectedPaths,
      });
      form.reset(values);
    } catch (error) {
      setImpact(
        error instanceof ApiError && error.status === 409
          ? parseFeatureBranchImpact(error)
          : {
              message: 'Repository context could not be saved.',
              paths: [],
            },
      );
    }
  }

  const selected = new Set(selectedPaths);
  const scopeKey = metadataScope;
  return (
    <form className={styles.stack} onSubmit={form.handleSubmit(submit)}>
      <Card className={styles.card} width='100%'>
        <p className='fw-overline'>Repository</p>
        <h2>{context.data.fullName}</h2>
        <Controller
          name='branchMode'
          control={form.control}
          render={({ field }) => (
            <RadioGroup
              label='Branch source'
              value={field.value}
              onValueChange={(value) => value && field.onChange(value)}
            >
              <Radio
                label={`Inherit Project branch (${context.data.baseBranch})`}
                value='inherit'
              />
              <Radio label='Override for this Feature' value='override' />
            </RadioGroup>
          )}
        />
        {branchMode === 'override' ? (
          <Controller
            name='branchOverride'
            control={form.control}
            render={({ field }) => (
              <Select
                label='Feature branch'
                options={branchOptions}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        ) : null}
        {branches.hasNextPage ? (
          <Button
            type='button'
            variant='secondary'
            loading={branches.isFetchingNextPage}
            onClick={() => void branches.fetchNextPage()}
          >
            Load more branches
          </Button>
        ) : null}
      </Card>
      <div className={styles.pickerGrid}>
        <Card className={styles.card} width='100%'>
          <div className={styles.heading}>
            <h2>Repository files</h2>
            <span>{effectiveBranch}</span>
          </div>
          <Search
            aria-label='Search loaded repository paths'
            placeholder='Search loaded paths'
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            onClear={() => setQuery('')}
          />
          {query ? (
            <FileList
              items={matching}
              selected={selected}
              selectedBytes={selectedBytes}
              onToggle={togglePath}
            />
          ) : null}
          <div hidden={Boolean(query)}>
            <RepositoryDirectory
              key={scopeKey}
              accessToken={accessToken}
              projectKey={projectKey}
              repositoryKey={repositoryKey}
              branch={effectiveBranch}
              path=''
              selected={selected}
              selectedBytes={selectedBytes}
              onItems={registerItems}
              onToggle={togglePath}
            />
          </div>
        </Card>
        <Card className={styles.card} width='100%'>
          <div className={styles.heading}>
            <h2>Selected files</h2>
            <Button
              type='submit'
              variant='primary'
              loading={update.isPending}
              disabled={
                !form.formState.isDirty ||
                (branchMode === 'override' && !branchOverride)
              }
            >
              Save repository context
            </Button>
          </div>
          <p aria-live='polite'>
            {selectedPaths.length}/50 files ·{' '}
            {(selectedBytes / 1024 / 1024).toFixed(2)}/5 MiB loaded
          </p>
          {selectedPaths.length ? (
            <ul className={styles.selectedList}>
              {selectedPaths.map((path) => (
                <li key={path}>
                  <span>{path}</span>
                  <Button
                    isIcon
                    aria-label={`Remove ${path}`}
                    variant='ghost'
                    onClick={() =>
                      togglePath(
                        {
                          path,
                          name: path,
                          kind: 'file',
                          sizeBytes: loaded.get(path)?.sizeBytes ?? null,
                          selectable: true,
                          disabledReason: null,
                        },
                        false,
                      )
                    }
                  >
                    <X size={14} />
                  </Button>
                  {!loaded.has(path) ? (
                    <small>Not loaded at the current revision</small>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p>No files selected.</p>
          )}
        </Card>
      </div>
      {impact ? (
        <div className={styles.alert} role='alert'>
          <p>{impact.message}</p>
          {impact.paths.length ? (
            <ul>
              {impact.paths.map((path) => (
                <li key={path}>{path}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

interface RepositoryDirectoryProps {
  readonly accessToken: string;
  readonly projectKey: string;
  readonly repositoryKey: string;
  readonly branch: string;
  readonly path: string;
  readonly commitSha?: string;
  readonly selected: ReadonlySet<string>;
  readonly selectedBytes: number;
  readonly onItems: (
    commitSha: string,
    items: readonly TreeItemDto[],
    isRoot: boolean,
  ) => void;
  readonly onToggle: (item: TreeItemDto, checked: boolean) => void;
}

function RepositoryDirectory(props: RepositoryDirectoryProps) {
  const [openState, setOpenState] = useState<{
    readonly scope: string;
    readonly paths: ReadonlySet<string>;
  }>({ scope: '', paths: EMPTY_OPEN_PATHS });
  const tree = useRepositoryTree(
    props.accessToken,
    props.projectKey,
    props.repositoryKey,
    props.branch,
    props.path,
    props.commitSha,
    Boolean(props.branch),
  );
  const pages = tree.data?.pages;
  const items = useMemo(() => flattenTreePages(pages), [pages]);
  const resolvedCommitSha = pages?.[0]?.commitSha;
  const openScope = `${props.repositoryKey}:${props.branch}:${resolvedCommitSha ?? ''}:${props.path}`;
  const openPaths =
    openState.scope === openScope ? openState.paths : EMPTY_OPEN_PATHS;
  const { onItems } = props;

  useEffect(() => {
    if (resolvedCommitSha)
      onItems(resolvedCommitSha, items, props.path === '');
  }, [items, onItems, props.path, resolvedCommitSha]);

  if (tree.isPending) return <p role='status'>Loading files...</p>;
  if (tree.isError)
    return <p role='alert'>This directory could not be loaded.</p>;
  return (
    <>
      <ul className={styles.tree}>
        {items.map((item) => (
          <li key={item.path}>
            {item.kind === 'directory' ? (
              <>
                <button
                  type='button'
                  className={styles.folderButton}
                  aria-expanded={openPaths.has(item.path)}
                  onClick={() =>
                    setOpenState((current) => {
                      const next = new Set(
                        current.scope === openScope
                          ? current.paths
                          : EMPTY_OPEN_PATHS,
                      );
                      if (next.has(item.path)) next.delete(item.path);
                      else next.add(item.path);
                      return { scope: openScope, paths: next };
                    })
                  }
                >
                  <ChevronRight size={14} />
                  <Folder size={15} />
                  {item.name}
                </button>
                {openPaths.has(item.path) ? (
                  <RepositoryDirectory
                    {...props}
                    path={item.path}
                    commitSha={resolvedCommitSha}
                  />
                ) : null}
              </>
            ) : (
              <Checkbox
                checked={props.selected.has(item.path)}
                disabled={
                  !item.selectable ||
                  (!props.selected.has(item.path) &&
                    (props.selected.size >= 50 ||
                      props.selectedBytes + (item.sizeBytes ?? 0) >
                        5 * 1024 * 1024))
                }
                label={
                  <span className={styles.fileLabel}>
                    <File size={14} />
                    {item.name}
                  </span>
                }
                description={
                  item.disabledReason ??
                  (item.sizeBytes === null
                    ? undefined
                    : `${(item.sizeBytes / 1024).toFixed(1)} KiB`)
                }
                onChange={(event) =>
                  props.onToggle(item, event.currentTarget.checked)
                }
              />
            )}
          </li>
        ))}
      </ul>
      {tree.hasNextPage ? (
        <Button
          type='button'
          variant='secondary'
          loading={tree.isFetchingNextPage}
          onClick={() => void tree.fetchNextPage()}
        >
          {props.path
            ? `Load more files in ${props.path}`
            : 'Load more repository files'}
        </Button>
      ) : null}
    </>
  );
}

function FileList({
  items,
  selected,
  selectedBytes,
  onToggle,
}: {
  readonly items: readonly TreeItemDto[];
  readonly selected: ReadonlySet<string>;
  readonly selectedBytes: number;
  readonly onToggle: (item: TreeItemDto, checked: boolean) => void;
}) {
  return (
    <ul className={styles.tree}>
      {items.map((item) => (
        <li key={item.path}>
          <Checkbox
            checked={selected.has(item.path)}
            disabled={
              !item.selectable ||
              (!selected.has(item.path) &&
                (selected.size >= 50 ||
                  selectedBytes + (item.sizeBytes ?? 0) > 5 * 1024 * 1024))
            }
            label={item.path}
            onChange={(event) =>
              onToggle(item, event.currentTarget.checked)
            }
          />
        </li>
      ))}
    </ul>
  );
}

function StatusCard({ title }: { readonly title: string }) {
  return (
    <Card className={styles.empty} width='100%'>
      <h2>{title}</h2>
      <p>Repository settings are managed from the Project Repository tab.</p>
    </Card>
  );
}

function parseFeatureBranchImpact(error: ApiError) {
  const body = isRecord(error.details) ? error.details : {};
  const details = isRecord(body.details) ? body.details : {};
  const paths = Array.isArray(details.paths)
    ? details.paths.flatMap((candidate) =>
        isRecord(candidate) && typeof candidate.path === 'string'
          ? [candidate.path]
          : [],
      )
    : [];
  return {
    message:
      'One or more selected paths are missing or filtered on this branch. No changes were saved.',
    paths,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sameTreeItem(
  left: TreeItemDto | undefined,
  right: TreeItemDto,
): boolean {
  return (
    left?.path === right.path &&
    left.name === right.name &&
    left.kind === right.kind &&
    left.sizeBytes === right.sizeBytes &&
    left.selectable === right.selectable &&
    left.disabledReason === right.disabledReason
  );
}
