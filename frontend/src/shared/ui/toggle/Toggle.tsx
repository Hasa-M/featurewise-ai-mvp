import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

import styles from './Toggle.module.css';

type ToggleAccessibleName =
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

type ToggleBaseProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'aria-label' | 'aria-labelledby' | 'children' | 'size' | 'type'
> & {
  description?: ReactNode;
  labelWeight?: ToggleLabelWeight;
};
export type ToggleLabelWeight = 'regular' | 'medium';

export type ToggleProps = ToggleBaseProps & ToggleAccessibleName;

export function Toggle({
  'aria-describedby': ariaDescribedBy,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  className,
  description,
  disabled,
  labelWeight = 'regular',
  id,
  label,
  ...props
}: ToggleProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const labelId = label ? `${inputId}-label` : undefined;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const describedBy = [ariaDescribedBy, descriptionId]
    .filter(Boolean)
    .join(' ');
  const classes = [styles.root, className].filter(Boolean).join(' ');

  return (
    <label
      className={classes}
      data-disabled={disabled || undefined}
      data-label-weight={labelWeight}
    >
      <input
        {...props}
        aria-describedby={describedBy || undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy ?? labelId}
        className={styles.input}
        disabled={disabled}
        id={inputId}
        role="switch"
        type="checkbox"
      />
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
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
