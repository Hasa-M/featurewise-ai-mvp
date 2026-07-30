import { ChevronRight, Ellipsis } from 'lucide-react';
import { Fragment, useEffect, useId, useRef, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

import {
  type NavigationLinkComponent,
  useNavigationLinkComponent,
} from '../navigation-link';
import { MenuItem, MenuWrapper } from '../menu';
import { useOverflowTitle } from '@/shared/model';

import styles from './Breadcrumb.module.css';

export type BreadcrumbItemKind = 'folder' | 'item';

export type BreadcrumbItem = {
  href: string;
  icon?: ReactNode;
  kind: BreadcrumbItemKind;
  label: string;
};

export type BreadcrumbItems = readonly [
  BreadcrumbItem,
  ...BreadcrumbItem[],
];

export type BreadcrumbProps = Omit<
  HTMLAttributes<HTMLElement>,
  'children'
> & {
  items: BreadcrumbItems;
  linkComponent?: NavigationLinkComponent;
  overflowLabel?: string;
  titleId?: string;
};

function BreadcrumbLabelContent({ item }: { item: BreadcrumbItem }) {
  const overflowTitle = useOverflowTitle<HTMLSpanElement>();

  return (
    <>
      {item.icon ? (
        <span aria-hidden={true} className={styles.icon}>
          {item.icon}
        </span>
      ) : null}
      <span {...overflowTitle}>{item.label}</span>
    </>
  );
}

export function Breadcrumb({
  'aria-label': ariaLabel = 'Breadcrumb',
  className,
  items,
  linkComponent,
  overflowLabel = 'Show hidden breadcrumb levels',
  titleId,
  ...props
}: BreadcrumbProps) {
  const defaultLinkComponent = useNavigationLinkComponent();
  const LinkComponent = linkComponent ?? defaultLinkComponent;
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hasOverflow = items.length > 4;
  const currentItem = items.at(-1);
  const hiddenItems = hasOverflow
    ? items.slice(2, -2)
    : [];
  const visibleItems = hasOverflow
    ? [...items.slice(0, 2), ...items.slice(-2)]
    : items;

  function closeOverflow({ restoreFocus = false } = {}) {
    setIsOverflowOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!isOverflowOpen) return;

    menuContainerRef.current
      ?.querySelector<HTMLElement>('[role=menuitem]')
      ?.focus();

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        closeOverflow();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOverflowOpen]);

  return (
    <nav
      {...props}
      aria-label={ariaLabel}
      className={[styles.breadcrumb, className].filter(Boolean).join(' ')}
      ref={rootRef}
    >
      <ol className={styles.list}>
        {visibleItems.map((item, index) => {
          const isCurrent = item === currentItem;
          const previousItem = visibleItems[index - 1];
          const showOverflow = hasOverflow && index === 2;
          const showSeparator =
            index > 0 && !showOverflow && previousItem?.kind === 'item';
          const labelClassName = [
            styles.label,
            item.kind === 'folder' ? styles.folderLabel : styles.itemLabel,
            isCurrent && styles.currentLabel,
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <Fragment key={`${item.label}-${index}`}>
            {showOverflow ? (
              <li className={[styles.item, styles.overflowItem].join(' ')}>
                <ChevronRight
                  aria-hidden={true}
                  className={styles.separator}
                  size={14}
                  strokeWidth={1.75}
                />
                <div className={styles.overflowRoot}>
                  <button
                    aria-controls={menuId}
                    aria-expanded={isOverflowOpen}
                    aria-haspopup={'menu'}
                    aria-label={overflowLabel}
                    className={styles.overflowTrigger}
                    onClick={() => setIsOverflowOpen((isOpen) => !isOpen)}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowDown' && !isOverflowOpen) {
                        event.preventDefault();
                        setIsOverflowOpen(true);
                      }
                    }}
                    ref={triggerRef}
                    title={overflowLabel}
                    type={'button'}
                  >
                    <Ellipsis
                      aria-hidden={true}
                      size={15}
                      strokeWidth={1.75}
                    />
                  </button>
                  {isOverflowOpen ? (
                    <div
                      className={styles.overflowMenu}
                      ref={menuContainerRef}
                    >
                      <MenuWrapper
                        aria-label={'Hidden breadcrumb levels'}
                        id={menuId}
                        onEscape={() =>
                          closeOverflow({ restoreFocus: true })
                        }
                      >
                        {hiddenItems.map((hiddenItem, hiddenIndex) => (
                          <MenuItem
                            href={hiddenItem.href}
                            key={`${hiddenItem.label}-${hiddenIndex}`}
                            leadingIcon={hiddenItem.icon}
                            linkComponent={LinkComponent}
                            onClick={() => closeOverflow()}
                          >
                            {hiddenItem.label}
                          </MenuItem>
                        ))}
                      </MenuWrapper>
                    </div>
                  ) : null}
                </div>
                <ChevronRight
                  aria-hidden={true}
                  className={styles.separator}
                  size={14}
                  strokeWidth={1.75}
                />
              </li>
            ) : null}
            <li className={styles.item}>
              {showSeparator ? (
                <ChevronRight
                  aria-hidden={true}
                  className={styles.separator}
                  size={14}
                  strokeWidth={1.75}
                />
              ) : null}

              {isCurrent ? (
                <h1 className={styles.currentHeading} id={titleId}>
                  <LinkComponent
                    aria-current={'page'}
                    className={labelClassName}
                    href={item.href}
                  >
                    <BreadcrumbLabelContent item={item} />
                  </LinkComponent>
                </h1>
              ) : (
                <LinkComponent
                  className={labelClassName}
                  href={item.href}
                >
                  <BreadcrumbLabelContent item={item} />
                </LinkComponent>
              )}
            </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
