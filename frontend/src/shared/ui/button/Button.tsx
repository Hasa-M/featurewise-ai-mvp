import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import styles from './Button.module.css';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isIcon?: boolean;
  leadingIcon?: ReactNode;
  loading?: boolean;
  size?: ButtonSize;
  trailingIcon?: ReactNode;
  variant?: ButtonVariant;
}

export function Button({
  children,
  className,
  disabled,
  isIcon = false,
  leadingIcon,
  loading = false,
  size = 'medium',
  trailingIcon,
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    isIcon && styles.isIcon,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      className={classes}
      disabled={disabled || loading}
      type={type}
    >
      {loading ? (
        <LoaderCircle
          className={styles.spinner}
          size={16}
          aria-hidden="true"
        />
      ) : leadingIcon ? (
        <span className={styles.iconSlot} aria-hidden="true">
          {leadingIcon}
        </span>
      ) : null}
      <span>{children}</span>
      {!loading && trailingIcon ? (
        <span className={styles.iconSlot} aria-hidden="true">
          {trailingIcon}
        </span>
      ) : null}
    </button>
  );
}
