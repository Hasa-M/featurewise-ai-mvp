import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

type ButtonBaseProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> & {
  loading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

type StandardButtonProps = ButtonBaseProps & {
  children: ReactNode;
  isIcon?: false;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

type IconButtonProps = ButtonBaseProps & {
  'aria-label': string;
  children: ReactNode;
  isIcon: true;
  leadingIcon?: never;
  trailingIcon?: never;
};

export type ButtonProps = StandardButtonProps | IconButtonProps;

export function Button({
  children,
  className,
  disabled,
  isIcon = false,
  leadingIcon,
  loading = false,
  size = 'small',
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
          strokeWidth={1.75}
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
