import { zodResolver } from '@hookform/resolvers/zod';
import { lazy, Suspense, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { getApiErrorMessage } from '@/shared/api';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';

import {
  contextContentSchema,
  type ContextContentValues,
} from '../lib/context-form-schema';
import {
  useProjectContext,
  useUpdateProjectContext,
  type ProjectContext,
} from '../model/context';
import styles from './ProjectContextPanel.module.css';

const RichText = lazy(async () => {
  const richTextModule = await import('@/shared/ui/rich-text');
  return { default: richTextModule.RichText };
});

interface ProjectContextFormProps {
  readonly accessToken: string;
  readonly context: ProjectContext;
  readonly projectKey: string;
}

function ProjectContextForm({
  accessToken,
  context,
  projectKey,
}: ProjectContextFormProps) {
  const mutation = useUpdateProjectContext(accessToken, projectKey);
  const form = useForm<ContextContentValues>({
    defaultValues: { content: context.content },
    resolver: zodResolver(contextContentSchema),
  });

  useEffect(() => {
    form.reset({ content: context.content });
  }, [context.content, context.publicKey, form]);

  return (
    <form
      className={styles.form}
      onSubmit={form.handleSubmit(async (values) => {
        const updated = await mutation.mutateAsync(values.content);
        form.reset({ content: updated.content });
      })}
    >
      <Controller
        control={form.control}
        name='content'
        render={({ field, fieldState }) => (
          <Suspense
            fallback={
              <p className={styles.muted} role='status'>
                Loading project context editor...
              </p>
            }
          >
            <RichText
              aria-label='Project context'
              defaultValue={field.value}
              disabled={mutation.isPending}
              errorMessage={fieldState.error?.message}
              maxLength={20000}
              onBlur={field.onBlur}
              onChange={field.onChange}
              placeholder='Describe shared product behavior, architecture decisions, terminology, constraints, and project-wide rules.'
              showCharacterCount
            />
          </Suspense>
        )}
      />

      {mutation.isError ? (
        <p className={styles.error} role='alert'>
          {getApiErrorMessage(
            mutation.error,
            'The project context could not be saved.',
          )}
        </p>
      ) : null}

      <div className={styles.actions}>
        <span className={styles.saveState} role='status'>
          {form.formState.isDirty
            ? 'Unsaved project context changes'
            : 'Project context is saved'}
        </span>
        <Button
          disabled={!form.formState.isDirty}
          loading={mutation.isPending}
          type='submit'
        >
          Save project context
        </Button>
      </div>
    </form>
  );
}

export function ProjectContextPanel({
  accessToken,
  projectKey,
}: {
  readonly accessToken: string;
  readonly projectKey: string;
}) {
  const contextQuery = useProjectContext(accessToken, projectKey);

  if (contextQuery.isPending) {
    return (
      <p className={styles.status} role='status'>
        Loading project context...
      </p>
    );
  }

  if (contextQuery.isError) {
    return (
      <div className={styles.status} role='alert'>
        <p>The project context could not be loaded.</p>
        <Button onClick={() => void contextQuery.refetch()} size='small'>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <Card className={styles.card}>
      <div className={styles.heading}>
        <p className='fw-overline'>Project context</p>
        <h2>Shared project context</h2>
        <p>
          Add project-wide information that should inform future feature
          analyses. Feature specifications and supporting files remain
          separate.
        </p>
      </div>
      <ProjectContextForm
        accessToken={accessToken}
        context={contextQuery.data}
        projectKey={projectKey}
      />
    </Card>
  );
}
