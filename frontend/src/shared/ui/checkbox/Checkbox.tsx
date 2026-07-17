import { Check, Minus } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

import styles from './Checkbox.module.css';

type CheckboxAccessibleName =
  | {
      label: ReactNode;
      'aria-label'?: string;
      'aria-labelledby'?: string;
    }
  | {
      label?: never;
      'aria-label': string;
      'aria-labelledby'?: string;
    }
  | {
      label?: never;
      'aria-label'?: string;
      'aria-labelledby': string;
    };

type CheckboxBaseProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'aria-label' | 'aria-labelledby' | 'children' | 'size' | 'type'
> & {
  description?: ReactNode;
  indeterminate?: boolean;
  labelWeight?: CheckboxLabelWeight;
};
export type CheckboxLabelWeight = 'regular' | 'medium';

export type CheckboxProps = CheckboxBaseProps & CheckboxAccessibleName;

export function Checkbox({
  'aria-describedby': ariaDescribedBy,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  className,
  description,
  disabled,
  id,
  indeterminate = false,
  label,
  labelWeight = 'regular',
  ...props
}: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const labelId = label ? `${inputId}-label` : undefined;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const describedBy = [ariaDescribedBy, descriptionId]
    .filter(Boolean)
    .join(' ');
  const classes = [styles.root, className].filter(Boolean).join(' ');

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <label
      className={classes}
      data-disabled={disabled || undefined}
      data-label-weight={labelWeight}
    >
      <input
        {...props}
        aria-describedby={describedBy || undefined}
        ref={inputRef}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy ?? labelId}
        className={styles.input}
        disabled={disabled}
        id={inputId}
        type="checkbox"
      />
      <span className={styles.box} aria-hidden="true">
        <Check
          className={`${styles.icon} ${styles.checkIcon}`}
          size={14}
          strokeWidth={1.75}
        />
        <Minus
          className={`${styles.icon} ${styles.indeterminateIcon}`}
          size={14}
          strokeWidth={1.75}
        />
      </span>
      {label || description ? (
        <span className={styles.content}>
          {label ? (
            <span className={styles.label} id={labelId}>
              {label}
            </span>
          ) : null}
          {description ? (
            <span className={styles.description} id={descriptionId}>
              {description}
            </span>
          ) : null}
        </span>
      ) : null}
    </label>
  );
}
