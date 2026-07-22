import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { HTMLAttributes, MouseEventHandler, ReactNode } from 'react';

import { Button } from '../button';
import { DropdownCard, type DropdownCardProps } from '../dropdown-card';
import { Logo } from '../logo';
import {
  NativeNavigationLink,
  type NavigationLinkComponent,
} from '../navigation-link';
import styles from './Header.module.css';

export type HeaderProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  dropdownCardProps: DropdownCardProps;
  homeHref: string;
  homeLabel?: string;
  linkComponent?: NavigationLinkComponent;
  sidebarControls?: string;
  sidebarOpen?: boolean;
  onSidebarToggle?: MouseEventHandler<HTMLButtonElement>;
  sidebarToggleLabel?: string;
  userControl: ReactNode;
};

export function Header({
  className,
  dropdownCardProps,
  homeHref,
  homeLabel = 'Featurewise home',
  linkComponent: LinkComponent = NativeNavigationLink,
  onSidebarToggle,
  sidebarControls,
  sidebarOpen,
  sidebarToggleLabel =
    sidebarOpen === undefined
      ? 'Toggle sidebar'
      : sidebarOpen
        ? 'Hide sidebar'
        : 'Show sidebar',
  userControl,
  ...props
}: HeaderProps) {
  return (
    <header
      {...props}
      className={[styles.header, className].filter(Boolean).join(' ')}
    >
      <div className={styles.inner}>
        <div className={styles.start}>
          <Button
            aria-controls={sidebarControls}
            aria-expanded={sidebarOpen}
            aria-label={sidebarToggleLabel}
            className={styles.sidebarButton}
            isIcon
            onClick={onSidebarToggle}
            size="small"
            title={sidebarToggleLabel}
            variant="ghost"
          >
            {sidebarOpen === false ? (
              <PanelLeftOpen
                aria-hidden="true"
                size={17}
                strokeWidth={1.75}
              />
            ) : (
              <PanelLeftClose
                aria-hidden="true"
                size={17}
                strokeWidth={1.75}
              />
            )}
          </Button>
          <DropdownCard {...dropdownCardProps} />
        </div>
        <div aria-hidden="true" className={styles.navigationSlot} />
        <div className={styles.actions}>
          <LinkComponent
            aria-label={homeLabel}
            className={styles.homeLink}
            href={homeHref}
          >
            <Logo alt="" size="small" />
          </LinkComponent>
          {userControl}
        </div>
      </div>
    </header>
  );
}
