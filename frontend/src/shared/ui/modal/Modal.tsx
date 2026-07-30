import { X } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
  type RefObject,
} from 'react';

import { Button } from '../button';
import styles from './Modal.module.css';

export type ModalSize = 'small' | 'medium';

const FOCUSABLE_CONTENT_SELECTOR = [
  'button:not(:disabled)',
  '[href]',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export type ModalProps = Omit<
  ComponentPropsWithoutRef<'dialog'>,
  'children' | 'open' | 'title'
> & {
  actions?: ReactNode;
  children?: ReactNode;
  closeLabel?: string;
  description?: ReactNode;
  dismissible?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  size?: ModalSize;
  title: ReactNode;
};

export function Modal({
  'aria-describedby': ariaDescribedBy,
  'aria-labelledby': ariaLabelledBy,
  actions,
  children,
  className,
  closeLabel = 'Close modal',
  description,
  dismissible = true,
  initialFocusRef,
  onCancel,
  onClick,
  onClose,
  onKeyDown,
  onOpenChange,
  open,
  size = 'medium',
  title,
  ...props
}: ModalProps) {
  const generatedId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const titleId = `${generatedId}-title`;
  const descriptionId = description ? `${generatedId}-description` : undefined;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!wasOpenRef.current) {
        previouslyFocusedRef.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
      }

      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        } else {
          dialog.setAttribute('open', '');
        }
      }

      wasOpenRef.current = true;
      const content = dialog.querySelector<HTMLElement>(
        '[data-modal-content]',
      );
      const focusTarget =
        initialFocusRef?.current ??
        content?.querySelector<HTMLElement>(FOCUSABLE_CONTENT_SELECTOR);
      focusTarget?.focus();
      return;
    }

    if (dialog.open) {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    }

    if (wasOpenRef.current) {
      previouslyFocusedRef.current?.focus();
      previouslyFocusedRef.current = null;
      wasOpenRef.current = false;
    }
  }, [initialFocusRef, open]);

  function requestClose() {
    if (dismissible) onOpenChange(false);
  }

  return (
    <dialog
      {...props}
      aria-describedby={ariaDescribedBy ?? descriptionId}
      aria-labelledby={ariaLabelledBy ?? titleId}
      className={[
        styles.modal,
        size === 'medium' && styles.medium,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onCancel={(event) => {
        onCancel?.(event);
        if (event.defaultPrevented) return;

        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        onClick?.(event);
        if (
          !event.defaultPrevented &&
          event.target === event.currentTarget
        ) {
          requestClose();
        }
      }}
      onClose={(event) => {
        onClose?.(event);
        if (open) onOpenChange(false);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (!event.defaultPrevented && event.key === 'Escape') {
          event.preventDefault();
          requestClose();
        }
      }}
      ref={dialogRef}
    >
      <div className={styles.surface}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <h2 className={styles.title} id={titleId}>
              {title}
            </h2>
            {description ? (
              <div className={styles.description} id={descriptionId}>
                {description}
              </div>
            ) : null}
          </div>
          {dismissible ? (
            <Button
              aria-label={closeLabel}
              className={styles.closeButton}
              isIcon
              onClick={requestClose}
              size="small"
              title={closeLabel}
              variant="ghost"
            >
              <X aria-hidden="true" size={17} strokeWidth={1.75} />
            </Button>
          ) : null}
        </header>

        {children ? (
          <div className={styles.content} data-modal-content="">
            {children}
          </div>
        ) : null}
        {actions ? <footer className={styles.actions}>{actions}</footer> : null}
      </div>
    </dialog>
  );
}
