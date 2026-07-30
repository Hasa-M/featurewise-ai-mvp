import { Button } from '../button';
import { Modal } from '../modal';
import styles from './ConfirmModal.module.css';

export type ConfirmModalProps = {
  cancelLabel?: string;
  confirmLabel: string;
  description?: string;
  errorMessage?: string | null;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  pending?: boolean;
  title: string;
  variant?: 'danger' | 'primary';
};

export function ConfirmModal({
  cancelLabel = 'Cancel',
  confirmLabel,
  description,
  errorMessage,
  onConfirm,
  onOpenChange,
  open,
  pending = false,
  title,
  variant = 'primary',
}: ConfirmModalProps) {
  return (
    <Modal
      actions={
        <>
          <Button
            disabled={pending}
            onClick={() => onOpenChange(false)}
            variant='secondary'
          >
            {cancelLabel}
          </Button>
          <Button loading={pending} onClick={onConfirm} variant={variant}>
            {confirmLabel}
          </Button>
        </>
      }
      description={description}
      dismissible={!pending}
      onOpenChange={onOpenChange}
      open={open}
      size='small'
      title={title}
    >
      {errorMessage ? (
        <p className={styles.error} role='alert'>
          {errorMessage}
        </p>
      ) : null}
    </Modal>
  );
}
