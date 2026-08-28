import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { getApiErrorMessage } from '@/shared/api';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { TextArea } from '@/shared/ui/text-area';

import {
  featureSpecificationSchema,
  type FeatureSpecificationValues,
} from '../lib/feature-form-schemas';
import { useUpdateFeature, type Feature } from '../model/features';
import styles from './FeatureSpecificationPanel.module.css';

export function FeatureSpecificationPanel({
  accessToken,
  feature,
}: {
  readonly accessToken: string;
  readonly feature: Feature;
}) {
  const mutation = useUpdateFeature(accessToken);
  const form = useForm<FeatureSpecificationValues>({
    defaultValues: {
      specificationContent: feature.specificationContent,
    },
    resolver: zodResolver(featureSpecificationSchema),
  });

  useEffect(() => {
    form.reset({ specificationContent: feature.specificationContent });
  }, [feature.publicKey, feature.specificationContent, form]);

  return (
    <Card className={styles.card}>
      <div className={styles.heading}>
        <p className='fw-overline'>Canonical input</p>
        <h2>Feature specification</h2>
        <p>
          Describe the intended behavior, requirements, constraints, and
          acceptance criteria that future analyses should evaluate.
        </p>
      </div>
      <form
        className={styles.form}
        onSubmit={form.handleSubmit(async (values) => {
          const updated = await mutation.mutateAsync({
            featureKey: feature.publicKey,
            specificationContent: values.specificationContent,
          });
          form.reset({
            specificationContent: updated.specificationContent,
          });
        })}
      >
        <Controller
          control={form.control}
          name='specificationContent'
          render={({ field, fieldState }) => (
            <TextArea
              disabled={mutation.isPending}
              errorMessage={fieldState.error?.message}
              label='Feature specification'
              maxLength={2000}
              name={field.name}
              onBlur={field.onBlur}
              onChange={field.onChange}
              placeholder='Describe what this feature should do and how success will be evaluated.'
              rows={14}
              showCharacterCount
              value={field.value}
            />
          )}
        />
        {mutation.isError ? (
          <p className={styles.error} role='alert'>
            {getApiErrorMessage(
              mutation.error,
              'The feature specification could not be saved.',
            )}
          </p>
        ) : null}
        <div className={styles.actions}>
          <span className={styles.saveState} role='status'>
            {form.formState.isDirty
              ? 'Unsaved specification changes'
              : 'Specification is saved'}
          </span>
          <Button
            disabled={!form.formState.isDirty}
            loading={mutation.isPending}
            type='submit'
          >
            Save specification
          </Button>
        </div>
      </form>
    </Card>
  );
}
