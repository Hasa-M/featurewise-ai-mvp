import { UserRound } from 'lucide-react';
import type { HTMLAttributes, MouseEventHandler } from 'react';

import { Breadcrumb, type BreadcrumbItems } from '../breadcrumb';
import { Button } from '../button';
import { Logo } from '../logo';
import styles from './Header.module.css';

export type HeaderProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  breadcrumbItems: BreadcrumbItems;
  homeHref: string;
  homeLabel?: string;
  onUserClick?: MouseEventHandler<HTMLButtonElement>;
  userLabel?: string;
};

export function Header({
  breadcrumbItems,
  className,
  homeHref,
  homeLabel = 'Featurewise home',
  onUserClick,
  userLabel = 'Open user settings',
  ...props
}: HeaderProps) {
  return (
    <header
      {...props}
      className={[styles.header, className].filter(Boolean).join(' ')}
    >
      <div className={styles.inner}>
        <Breadcrumb className={styles.breadcrumb} items={breadcrumbItems} />
        <div className={styles.actions}>
          <a aria-label={homeLabel} className={styles.homeLink} href={homeHref}>
            <Logo alt="" size="small" tone="inverse" />
          </a>
          <Button
            aria-label={userLabel}
            className={styles.userButton}
            isIcon
            onClick={onUserClick}
            size="small"
            title={userLabel}
            variant="ghost"
          >
            <UserRound size={17} strokeWidth={1.75} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </header>
  );
}
