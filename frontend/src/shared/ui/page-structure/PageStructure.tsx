import { useId, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

import { Header, type HeaderProps } from '../header';
import { Sidebar, type SidebarProps } from '../sidebar';
import styles from './PageStructure.module.css';

type ManagedHeaderProps = Omit<
  HeaderProps,
  | 'onSidebarToggle'
  | 'sidebarControls'
  | 'sidebarOpen'
  | 'sidebarToggleLabel'
>;

export type PageStructureProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
> & {
  children: ReactNode;
  defaultSidebarOpen?: boolean;
  headerProps: ManagedHeaderProps;
  onSidebarOpenChange?: (open: boolean) => void;
  sidebarOpen?: boolean;
  sidebarProps: SidebarProps;
};

export function PageStructure({
  children,
  className,
  defaultSidebarOpen = true,
  headerProps,
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
          <Sidebar {...sidebarProps} />
        </div>
        <main className={styles.contentViewport}>
          <div className={styles.content}>{children}</div>
        </main>
      </div>
    </div>
  );
}
