import { useId, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

import { Header, type HeaderProps } from '../header';
import type { NavigationLinkComponent } from '../navigation-link';
import { Sidebar, type SidebarProps } from '../sidebar';
import styles from './PageStructure.module.css';

type ManagedHeaderProps = Omit<
  HeaderProps,
  | 'onSidebarToggle'
  | 'linkComponent'
  | 'sidebarControls'
  | 'sidebarOpen'
  | 'sidebarToggleLabel'
>;

type ManagedSidebarProps = Omit<SidebarProps, 'linkComponent'>;

export type PageStructureProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
> & {
  children: ReactNode;
  defaultSidebarOpen?: boolean;
  headerProps: ManagedHeaderProps;
  linkComponent?: NavigationLinkComponent;
  onSidebarOpenChange?: (open: boolean) => void;
  sidebarOpen?: boolean;
  sidebarProps: ManagedSidebarProps;
};

export function PageStructure({
  children,
  className,
  defaultSidebarOpen = true,
  headerProps,
  linkComponent,
  onSidebarOpenChange,
  sidebarOpen,
  sidebarProps,
  ...props
}: PageStructureProps) {
  const [uncontrolledSidebarOpen, setUncontrolledSidebarOpen] = useState(
    defaultSidebarOpen,
  );
  const sidebarRegionId = useId();
  const isSidebarOpen = sidebarOpen ?? uncontrolledSidebarOpen;

  function toggleSidebar() {
    const nextOpen = !isSidebarOpen;

    if (sidebarOpen === undefined) {
      setUncontrolledSidebarOpen(nextOpen);
    }

    onSidebarOpenChange?.(nextOpen);
  }

  return (
    <div
      {...props}
      className={[styles.structure, className].filter(Boolean).join(' ')}
    >
      <Header
        {...headerProps}
        linkComponent={linkComponent}
        onSidebarToggle={toggleSidebar}
        sidebarControls={sidebarRegionId}
        sidebarOpen={isSidebarOpen}
      />
      <div className={styles.workspace}>
        <div
          className={styles.sidebarRegion}
          hidden={!isSidebarOpen}
          id={sidebarRegionId}
        >
          <Sidebar {...sidebarProps} linkComponent={linkComponent} />
        </div>
        <main className={styles.contentViewport}>
          <div className={styles.content}>{children}</div>
        </main>
      </div>
    </div>
  );
}
