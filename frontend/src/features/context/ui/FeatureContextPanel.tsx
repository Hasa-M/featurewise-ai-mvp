import { zodResolver } from '@hookform/resolvers/zod';
import {
  Archive,
  Download,
  FilePlus2,
  FileText,
  Image,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { lazy, Suspense, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
import { ConfirmModal } from '@/shared/ui/confirm-modal';
import { Modal } from '@/shared/ui/modal';
import { Search } from '@/shared/ui/search';

import {
  contextPromptSchema,
  type ContextPromptValues,
} from '../lib/context-form-schema';
import { formatFileSize } from '../lib/file-format';
import {
  openContextFile,
  useFeatureContext,
  useFeatureContextArchive,
  usePermanentlyDeleteContextFile,
  useSelectArchivedContextFiles,
  useSetContextFileSelection,
  useUpdateFeatureContext,
  useUploadFeatureContextFile,
  type ContextFile,
} from '../model/context';
import styles from './FeatureContextPanel.module.css';

const RichText = lazy(async () => {
  const richTextModule = await import('@/shared/ui/rich-text');
  return { default: richTextModule.RichText };
});

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The operation failed.';
}

function FileIcon({ file }: { readonly file: ContextFile }) {
  return file.assetType === 'image' ? (
    <Image aria-hidden='true' size={18} strokeWidth={1.75} />
  ) : (
    <FileText aria-hidden='true' size={18} strokeWidth={1.75} />
  );
}

interface FeatureContextPanelProps {
  readonly accessToken: string;
  readonly featureKey: string;
}

interface ContextPromptFormProps {
  readonly accessToken: string;
  readonly featureKey: string;
  readonly initialPrompt: string;
  readonly onError: (message: string | null) => void;
}

function ContextPromptForm({
  accessToken,
  featureKey,
  initialPrompt,
  onError,
}: ContextPromptFormProps) {
  const updatePrompt = useUpdateFeatureContext(accessToken, featureKey);
  const form = useForm<ContextPromptValues>({
    defaultValues: { promptContent: initialPrompt },
    resolver: zodResolver(contextPromptSchema),
  });

  return (
    <form
      className={styles.promptForm}
      onSubmit={form.handleSubmit(async (values) => {
        onError(null);
        try {
          const updated = await updatePrompt.mutateAsync(values.promptContent);
          form.reset({ promptContent: updated.promptContent });
        } catch (error: unknown) {
          onError(errorMessage(error));
        }
      })}
    >
      <Controller
        control={form.control}
        name='promptContent'
        render={({ field, fieldState }) => (
          <Suspense fallback={<p className={styles.muted}>Loading context editor…</p>}>
            <RichText
              aria-label='Supporting context'
              defaultValue={field.value}
              errorMessage={fieldState.error?.message}
              maxLength={20000}
              onBlur={field.onBlur}
              onChange={field.onChange}
              placeholder='Describe product behavior, constraints, design decisions, APIs, risks, and execution rules.'
              showCharacterCount
            />
          </Suspense>
        )}
      />
      <div className={styles.formActions}>
        <span className={styles.saveState}>
          {form.formState.isDirty
            ? 'Unsaved context changes'
            : 'Context is saved'}
        </span>
        <Button
          disabled={!form.formState.isDirty}
          loading={updatePrompt.isPending}
          type='submit'
        >
          Save context
        </Button>
      </div>
    </form>
  );
}

export function FeatureContextPanel({
  accessToken,
  featureKey,
}: FeatureContextPanelProps) {
  const contextQuery = useFeatureContext(accessToken, featureKey);
  const uploadFile = useUploadFeatureContextFile(accessToken, featureKey);
  const setSelection = useSetContextFileSelection(accessToken, featureKey);
  const purgeFile = usePermanentlyDeleteContextFile(accessToken, featureKey);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveQuery, setArchiveQuery] = useState('');
  const [archiveSelection, setArchiveSelection] = useState<Set<string>>(
    () => new Set(),
  );
  const [deleteFile, setDeleteFile] = useState<ContextFile | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [draggingFiles, setDraggingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const archive = useFeatureContextArchive(
    accessToken,
    featureKey,
    archiveQuery,
    archiveOpen,
  );
  const selectArchived = useSelectArchivedContextFiles(accessToken, featureKey);

  if (contextQuery.isPending) {
    return <p className={styles.status}>Loading Context...</p>;
  }

  if (contextQuery.isError) {
    return (
      <div className={styles.status} role='alert'>
        <p>The Context could not be loaded.</p>
        <Button onClick={() => void contextQuery.refetch()} size='small'>
          Retry
        </Button>
      </div>
    );
  }

  const context = contextQuery.data;
  const selectedFileCount = context.files.filter((file) => file.selected).length;

  async function handleFiles(files: FileList | null) {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;

    setOperationError(null);
    try {
      for (const file of selectedFiles) {
        setUploadProgress(0);
        await uploadFile.mutateAsync({ file, onProgress: setUploadProgress });
      }
    } catch (error: unknown) {
      setOperationError(errorMessage(error));
    } finally {
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDraggingFiles(false);
    void handleFiles(event.dataTransfer.files);
  }

  async function handleOpen(file: ContextFile) {
    setOperationError(null);
    try {
      await openContextFile(accessToken, file);
    } catch (error: unknown) {
      setOperationError(errorMessage(error));
    }
  }

  function closeArchive() {
    setArchiveOpen(false);
    setArchiveQuery('');
    setArchiveSelection(new Set());
  }

  return (
    <div className={styles.layout}>
      <Card className={styles.sectionCard}>
        <div className={styles.sectionHeading}>
          <div>
            <p className='fw-overline'>Supporting context</p>
            <h2>Notes and constraints</h2>
            <p className={styles.muted}>
              Add editable notes and constraints. Attached files remain separate.
            </p>
          </div>
        </div>
        <ContextPromptForm
          accessToken={accessToken}
          featureKey={featureKey}
          initialPrompt={context.promptContent}
          onError={setOperationError}
        />
      </Card>

      <Card className={styles.sectionCard}>
        <div className={styles.sectionHeading}>
          <div>
            <p className='fw-overline'>Files</p>
            <h2>Selected context files</h2>
            <p className={styles.muted}>
              {selectedFileCount}/10 selected · up to 50 MB combined · 20 retained per context
            </p>
          </div>
          <div className={styles.headingActions}>
            <Button
              leadingIcon={<Archive size={16} strokeWidth={1.75} />}
              onClick={() => setArchiveOpen(true)}
              variant='secondary'
            >
              Files archive
            </Button>
            <Button
              leadingIcon={<FilePlus2 size={16} strokeWidth={1.75} />}
              loading={uploadFile.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              Add files
            </Button>
            <input
              className={styles.hiddenInput}
              multiple
              onChange={(event) => void handleFiles(event.currentTarget.files)}
              ref={fileInputRef}
              type='file'
            />
          </div>
        </div>

        {uploadProgress !== null ? (
          <div className={styles.progress} role='status'>
            <span>Uploading file</span>
            <progress max={100} value={uploadProgress} />
            <span>{uploadProgress}%</span>
          </div>
        ) : null}

        <div
          className={styles.fileDropZone}
          data-dragging={draggingFiles}
          onDragEnter={(event) => {
            event.preventDefault();
            setDraggingFiles(true);
          }}
          onDragLeave={() => setDraggingFiles(false)}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={handleDrop}
        >
          {context.files.length === 0 ? (
            <div className={styles.emptyFiles}>
              <FilePlus2 aria-hidden='true' size={28} strokeWidth={1.5} />
              <p>No files are selected.</p>
              <p>Drag files here, or add documents, images, structured data, and focused code/config files.</p>
            </div>
          ) : (
            <ul className={styles.fileList}>
              {context.files.map((file) => (
                <li className={styles.fileRow} key={file.publicKey}>
                <span className={styles.fileIcon}><FileIcon file={file} /></span>
                <span className={styles.fileDetails}>
                  <strong>{file.filename}</strong>
                  <span>
                    {formatFileSize(file.sizeBytes)} · {file.status.replace('_', ' ')}
                  </span>
                  {file.failure ? (
                    <span className={styles.fileError}>{file.failure.message ?? file.failure.code}</span>
                  ) : null}
                </span>
                <span className={styles.fileActions}>
                  {file.status === 'ready' ? (
                    <>
                      <Button
                        leadingIcon={<Download size={15} strokeWidth={1.75} />}
                        onClick={() => void handleOpen(file)}
                        variant='ghost'
                      >
                        Open
                      </Button>
                      <Button
                        disabled={setSelection.isPending}
                        onClick={() =>
                          void setSelection
                            .mutateAsync({ fileKey: file.publicKey, selected: false })
                            .catch((error: unknown) => setOperationError(errorMessage(error)))
                        }
                        variant='secondary'
                      >
                        Remove from context
                      </Button>
                    </>
                  ) : file.canDeletePermanently ? (
                    <Button onClick={() => setDeleteFile(file)} variant='danger'>
                      {file.status === 'failed' ? 'Dismiss' : 'Cancel'}
                    </Button>
                  ) : (
                    <span className={styles.processing}>Preparing…</span>
                  )}
                </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {operationError ? <p className={styles.error} role='alert'>{operationError}</p> : null}

      <Modal
        actions={
          <>
            <Button onClick={closeArchive} variant='secondary'>Close</Button>
            <Button
              disabled={archiveSelection.size === 0}
              leadingIcon={<RotateCcw size={16} strokeWidth={1.75} />}
              loading={selectArchived.isPending}
              onClick={() => {
                void selectArchived
                  .mutateAsync([...archiveSelection])
                  .then(() => {
                    closeArchive();
                  })
                  .catch((error: unknown) => setOperationError(errorMessage(error)));
              }}
            >
              Add selected files
            </Button>
          </>
        }
        description='Files removed from this Context stay here and can be selected again without uploading or converting them.'
        onOpenChange={(open) => {
          if (open) setArchiveOpen(true);
          else closeArchive();
        }}
        open={archiveOpen}
        title='Files archive'
      >
        <div className={styles.archiveBody}>
          <Search
            aria-label='Search archived files'
            onChange={(event) => setArchiveQuery(event.currentTarget.value)}
            onClear={() => setArchiveQuery('')}
            placeholder='Search files'
            value={archiveQuery}
          />
          {archive.isPending ? <p className={styles.muted}>Loading archive…</p> : null}
          {archive.isError ? <p className={styles.error} role='alert'>The archive could not be loaded.</p> : null}
          {archive.data?.files.length === 0 ? (
            <p className={styles.muted}>No archived files match this search.</p>
          ) : null}
          <ul className={styles.archiveList}>
            {archive.data?.files.map((file) => (
              <li className={styles.archiveRow} key={file.publicKey}>
                <Checkbox
                  checked={archiveSelection.has(file.publicKey)}
                  label={file.filename}
                  description={formatFileSize(file.sizeBytes)}
                  onChange={(event) => {
                    const { checked } = event.currentTarget;
                    setArchiveSelection((current) => {
                      const next = new Set(current);
                      if (checked) next.add(file.publicKey);
                      else next.delete(file.publicKey);
                      return next;
                    });
                  }}
                />
                <div className={styles.fileActions}>
                  <Button onClick={() => void handleOpen(file)} variant='ghost'>Open</Button>
                  {file.canDeletePermanently ? (
                    <Button
                      aria-label={`Permanently delete ${file.filename}`}
                      isIcon
                      onClick={() => setDeleteFile(file)}
                      title={`Permanently delete ${file.filename}`}
                      variant='ghost'
                    >
                      <Trash2 aria-hidden='true' size={16} strokeWidth={1.75} />
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Modal>

      <ConfirmModal
        confirmLabel='Delete permanently'
        description={
          deleteFile
            ? `${deleteFile.filename} has never been used by a run. Its stored bytes and prepared version will be deleted.`
            : undefined
        }
        errorMessage={purgeFile.isError ? errorMessage(purgeFile.error) : null}
        onConfirm={() => {
          if (!deleteFile) return;
          void purgeFile.mutateAsync(deleteFile.publicKey).then(() => setDeleteFile(null));
        }}
        onOpenChange={(open) => {
          if (!open && !purgeFile.isPending) setDeleteFile(null);
        }}
        open={deleteFile !== null}
        pending={purgeFile.isPending}
        title='Delete file permanently?'
        variant='danger'
      />
    </div>
  );
}
