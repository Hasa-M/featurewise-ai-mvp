import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { getApiErrorMessage } from '@/shared/api';
import { Checkbox } from '@/shared/ui/checkbox';
import { ConfirmModal } from '@/shared/ui/confirm-modal';
import { FormModal } from '@/shared/ui/form-modal';
import { RadioCard, RadioGroup } from '@/shared/ui/radio-group';
import { TextArea } from '@/shared/ui/text-area';
import { TextInput } from '@/shared/ui/text-input';

import {
  featureCreateSchema,
  featureQuickEditSchema,
  type FeatureCreateValues,
  type FeatureQuickEditValues,
} from '../lib/feature-form-schemas';
import {
  FeatureActionsContext,
  type FeatureActionsContextValue,
  type FeatureCreateSuccessBehavior,
  type FeatureDeleteSuccessBehavior,
} from '../model/feature-actions';
import {
  useCreateFeature,
  useDeleteFeature,
  useUpdateFeature,
  type Feature,
} from '../model/features';

type FeatureAction =
  | {
      readonly kind: 'create';
      readonly projectId: string;
      readonly successBehavior: FeatureCreateSuccessBehavior;
    }
  | { readonly feature: Feature; readonly kind: 'edit' }
  | {
      readonly feature: Feature;
      readonly kind: 'delete';
      readonly successBehavior: FeatureDeleteSuccessBehavior;
    };

function CreateFeatureDialog({
  accessToken,
  action,
  close,
  onCreated,
}: {
  readonly accessToken: string;
  readonly action: Extract<FeatureAction, { kind: 'create' }>;
  readonly close: () => void;
  readonly onCreated: (
    feature: Feature,
    behavior: FeatureCreateSuccessBehavior,
  ) => void;
}) {
  const mutation = useCreateFeature(accessToken);
  const form = useForm<FeatureCreateValues>({
    defaultValues: { title: '' },
    resolver: zodResolver(featureCreateSchema),
  });

  return (
    <FormModal
      description='Create the feature identity now, then add intent and context in its workspace.'
      errorMessage={
        mutation.error
          ? getApiErrorMessage(mutation.error, 'The feature could not be created.')
          : null
      }
      onOpenChange={(open) => {
        if (!open) close();
      }}
      onReset={form.reset}
      onSubmit={form.handleSubmit(async (values) => {
        const feature = await mutation.mutateAsync({
          origin: values.origin,
          projectId: action.projectId,
          title: values.title,
        });
        close();
        onCreated(feature, action.successBehavior);
      })}
      open
      submitLabel='Create feature'
      submitting={mutation.isPending}
      title='Create feature'
    >
      <Controller
        control={form.control}
        name='title'
        render={({ field, fieldState }) => (
          <TextInput
            disabled={mutation.isPending}
            errorMessage={fieldState.error?.message}
            label='Feature title'
            maxLength={180}
            name={field.name}
            onBlur={field.onBlur}
            onChange={field.onChange}
            placeholder='For example, Saved views'
            required
            value={field.value}
          />
        )}
      />
      <Controller
        control={form.control}
        name='origin'
        render={({ field, fieldState }) => (
          <RadioGroup
            description={
              fieldState.error?.message ??
              'Origin controls which generation workflow is available and cannot be changed later.'
            }
            disabled={mutation.isPending}
            label='Feature origin'
            onValueChange={field.onChange}
            value={field.value ?? null}
          >
            <RadioCard
              description='A capability that Featurewise will specify directly.'
              label='Brand new'
              value='brand_new'
            />
            <RadioCard
              description='A capability that already exists and needs a captured baseline.'
              label='Mapped existing'
              value='mapped_existing'
            />
          </RadioGroup>
        )}
      />
    </FormModal>
  );
}

function EditFeatureDialog({
  accessToken,
  close,
  feature,
}: {
  readonly accessToken: string;
  readonly close: () => void;
  readonly feature: Feature;
}) {
  const mutation = useUpdateFeature(accessToken);
  const form = useForm<FeatureQuickEditValues>({
    defaultValues: {
      brief: feature.brief ?? '',
      includeInProjectContext: feature.includeInProjectContext,
      title: feature.title,
    },
    resolver: zodResolver(featureQuickEditSchema),
  });

  return (
    <FormModal
      description='Update bounded feature metadata. Existing run snapshots and validated specs do not change.'
      errorMessage={
        mutation.error
          ? getApiErrorMessage(mutation.error, 'The feature could not be saved.')
          : null
      }
      onOpenChange={(open) => {
        if (!open) close();
      }}
      onReset={form.reset}
      onSubmit={form.handleSubmit(async (values) => {
        await mutation.mutateAsync({
          brief: values.brief.trim() || null,
          featureId: feature.id,
          includeInProjectContext: values.includeInProjectContext,
          title: values.title,
        });
        close();
      })}
      open
      submitLabel='Save changes'
      submitting={mutation.isPending}
      title='Edit feature'
    >
      <Controller
        control={form.control}
        name='title'
        render={({ field, fieldState }) => (
          <TextInput
            disabled={mutation.isPending}
            errorMessage={fieldState.error?.message}
            label='Feature title'
            maxLength={180}
            name={field.name}
            onBlur={field.onBlur}
            onChange={field.onChange}
            required
            value={field.value}
          />
        )}
      />
      <Controller
        control={form.control}
        name='brief'
        render={({ field, fieldState }) => (
          <TextArea
            disabled={mutation.isPending}
            errorMessage={fieldState.error?.message}
            helperText='Keep this concise. Rich context belongs in the Feature workspace.'
            label='Feature brief'
            maxLength={2000}
            name={field.name}
            onBlur={field.onBlur}
            onChange={field.onChange}
            rows={5}
            showCharacterCount
            value={field.value}
          />
        )}
      />
      <Controller
        control={form.control}
        name='includeInProjectContext'
        render={({ field }) => (
          <Checkbox
            checked={field.value}
            description='Make this feature available to the system-generated project context used by future work.'
            disabled={mutation.isPending}
            label='Include in project context'
            name={field.name}
            onBlur={field.onBlur}
            onChange={(event) => field.onChange(event.currentTarget.checked)}
          />
        )}
      />
    </FormModal>
  );
}

function DeleteFeatureDialog({
  accessToken,
  action,
  close,
  onDeleted,
}: {
  readonly accessToken: string;
  readonly action: Extract<FeatureAction, { kind: 'delete' }>;
  readonly close: () => void;
  readonly onDeleted: (
    feature: Feature,
    behavior: FeatureDeleteSuccessBehavior,
  ) => void;
}) {
  const mutation = useDeleteFeature(accessToken);

  return (
    <ConfirmModal
      cancelLabel='Keep feature'
      confirmLabel='Delete feature'
      description={`Delete ${action.feature.title}? Its workspace will no longer be available. A feature with an active spec run cannot be deleted.`}
      errorMessage={
        mutation.error
          ? getApiErrorMessage(mutation.error, 'The feature could not be deleted.')
          : null
      }
      onConfirm={() => {
        void mutation.mutateAsync(action.feature).then((feature) => {
          close();
          onDeleted(feature, action.successBehavior);
        });
      }}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      open
      pending={mutation.isPending}
      title='Delete feature?'
      variant='danger'
    />
  );
}

export function FeatureActionsProvider({
  accessToken,
  children,
  onCreated,
  onDeleted,
}: {
  readonly accessToken: string;
  readonly children: ReactNode;
  readonly onCreated: (
    feature: Feature,
    behavior: FeatureCreateSuccessBehavior,
  ) => void;
  readonly onDeleted: (
    feature: Feature,
    behavior: FeatureDeleteSuccessBehavior,
  ) => void;
}) {
  const [action, setAction] = useState<FeatureAction>();
  const value = useMemo<FeatureActionsContextValue>(
    () => ({
      openCreate: ({ projectId, successBehavior = 'open-created' }) =>
        setAction({ kind: 'create', projectId, successBehavior }),
      openDelete: (
        feature,
        { successBehavior = 'parent-if-current' } = {},
      ) => setAction({ feature, kind: 'delete', successBehavior }),
      openEdit: (feature) => setAction({ feature, kind: 'edit' }),
    }),
    [],
  );
  const close = () => setAction(undefined);

  return (
    <FeatureActionsContext.Provider value={value}>
      {children}
      {action?.kind === 'create' ? (
        <CreateFeatureDialog
          accessToken={accessToken}
          action={action}
          close={close}
          onCreated={onCreated}
        />
      ) : action?.kind === 'edit' ? (
        <EditFeatureDialog
          accessToken={accessToken}
          close={close}
          feature={action.feature}
        />
      ) : action?.kind === 'delete' ? (
        <DeleteFeatureDialog
          accessToken={accessToken}
          action={action}
          close={close}
          onDeleted={onDeleted}
        />
      ) : null}
    </FeatureActionsContext.Provider>
  );
}
