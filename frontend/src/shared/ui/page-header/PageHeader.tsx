import type { HTMLAttributes, ReactNode } from 'react';

import styles from './PageHeader.module.css';

export type PageHeaderProps = Omit<
  HTMLAttributes<HTMLElement>,
  'children'
> & {
  actions?: ReactNode;
  breadcrumb: ReactNode;
  subtitle?: string;
};

export function PageHeader({
  actions,
  breadcrumb,
  className,
  subtitle,
  ...props
}: PageHeaderProps) {
  return (
    <header
      {...props}
      className={[styles.header, className].filter(Boolean).join(' ')}
    >
      <div className={styles.layout}>
        <div className={styles.heading}>
          <div className={styles.breadcrumb}>{breadcrumb}</div>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        {actions !== undefined && actions !== null ? (
          <div className={styles.actions}>{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
