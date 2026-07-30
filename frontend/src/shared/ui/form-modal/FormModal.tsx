import { useId, type FormEventHandler, type ReactNode } from 'react';

import { Button } from '../button';
import { Modal, type ModalProps } from '../modal';
import styles from './FormModal.module.css';

export type FormModalProps = Pick<
  ModalProps,
  'description' | 'open' | 'onOpenChange' | 'size' | 'title'
> & {
  cancelLabel?: string;
  children: ReactNode;
  errorMessage?: string | null;
  onReset: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  resetLabel?: string;
  submitLabel: string;
  submitting?: boolean;
};

export function FormModal({
  cancelLabel = 'Cancel',
  children,
  description,
  errorMessage,
  onOpenChange,
  onReset,
  onSubmit,
  open,
  resetLabel = 'Reset',
  size = 'medium',
  submitLabel,
  submitting = false,
  title,
}: FormModalProps) {
  const formId = useId();

  return (
    <Modal
      actions={
        <>
          <Button
            className={styles.resetAction}
            disabled={submitting}
            form={formId}
            type='reset'
            variant='ghost'
          >
            {resetLabel}
          </Button>
          <Button
            disabled={submitting}
            onClick={() => onOpenChange(false)}
            variant='secondary'
          >
            {cancelLabel}
          </Button>
          <Button form={formId} loading={submitting} type='submit'>
            {submitLabel}
          </Button>
        </>
      }
      description={description}
      dismissible={!submitting}
      onOpenChange={onOpenChange}
      open={open}
      size={size}
      title={title}
    >
      <form
        className={styles.form}
        id={formId}
        noValidate
        onReset={(event) => {
          event.preventDefault();
          onReset();
        }}
        onSubmit={onSubmit}
      >
        {children}
        {errorMessage ? (
          <p className={styles.error} role='alert'>
            {errorMessage}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
