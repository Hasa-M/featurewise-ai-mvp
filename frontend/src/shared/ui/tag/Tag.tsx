import { X } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';

import { useOverflowTitle } from '@/shared/model';

import styles from './Tag.module.css';

export type TagProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  children: ReactNode;
  disabled?: boolean;
  /** When provided, shows a clear control and calls this handler when activated. */
  onRemove?: () => void;
  removeLabel?: string;
};

export function Tag({
  children,
  className,
  disabled = false,
  onRemove,
  removeLabel = 'Remove tag',
  ...props
}: TagProps) {
  const overflowTitle = useOverflowTitle<HTMLSpanElement>();
  const classes = [styles.tag, className].filter(Boolean).join(' ');

  return (
    <span {...props} className={classes}>
      <span {...overflowTitle} className={styles.label}>
        {children}
      </span>
      {onRemove ? (
        <button
          aria-label={removeLabel}
          className={styles.remove}
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          title={removeLabel}
          type="button"
        >
          <X aria-hidden="true" size={12} strokeWidth={1.75} />
        </button>
      ) : null}
    </span>
  );
}
