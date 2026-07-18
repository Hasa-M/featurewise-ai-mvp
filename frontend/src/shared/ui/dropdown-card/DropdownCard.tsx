import { ChevronDown } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import styles from './DropdownCard.module.css';

export type DropdownCardAlignment = 'start' | 'end';

export type DropdownCardProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
> & {
  align?: DropdownCardAlignment;
  children: ReactNode;
  defaultOpen?: boolean;
  disabled?: boolean;
  label: string;
  leadingVisual?: ReactNode;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  panelLabel: string;
};

export function DropdownCard({
  align = 'start',
  children,
  className,
  defaultOpen = false,
  disabled = false,
  label,
  leadingVisual,
  onOpenChange,
  open,
  panelLabel,
  ...props
}: DropdownCardProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const isOpen = !disabled && (open ?? internalOpen);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(isOpen);

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (disabled && nextOpen) return;
      if (!isControlled) setInternalOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [disabled, isControlled, onOpenChange],
  );

  useEffect(() => {
    if (isOpen) {
      panelRef.current
        ?.querySelector<HTMLElement>(
          'input, button:not(:disabled), a[href], select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        ?.focus();
    } else if (wasOpenRef.current) {
      triggerRef.current?.focus();
    }

    wasOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, setOpen]);

  return (
    <div
      {...props}
      className={[styles.root, className].filter(Boolean).join(' ')}
      ref={rootRef}
    >
      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={styles.trigger}
        disabled={disabled}
        onClick={() => setOpen(!isOpen)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !isOpen) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        ref={triggerRef}
        type="button"
      >
        {leadingVisual ? (
          <span aria-hidden="true" className={styles.leadingVisual}>
            {leadingVisual}
          </span>
        ) : null}
        <span className={styles.label}>{label}</span>
        <ChevronDown
          aria-hidden="true"
          className={styles.chevron}
          size={15}
          strokeWidth={1.75}
        />
      </button>

      {isOpen ? (
        <div
          aria-label={panelLabel}
          className={[styles.panel, styles[align]].join(' ')}
          id={panelId}
          ref={panelRef}
          role="dialog"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
