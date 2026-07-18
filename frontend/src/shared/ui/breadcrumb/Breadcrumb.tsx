import { ChevronRight, Ellipsis } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { useEffect, useId, useRef, useState } from 'react';

import { MenuWrapper } from '../menu';
import styles from './Breadcrumb.module.css';

export type BreadcrumbItem = {
  href?: string;
  label: string;
};

export type BreadcrumbItems = readonly [BreadcrumbItem, ...BreadcrumbItem[]];

export type BreadcrumbProps = Omit<
  HTMLAttributes<HTMLElement>,
  'children'
> & {
  items: BreadcrumbItems;
  overflowLabel?: string;
};

function BreadcrumbLabel({ item }: { item: BreadcrumbItem }) {
  if (item.href) {
    return (
      <a className={styles.link} href={item.href}>
        {item.label}
      </a>
    );
  }

  return <span className={styles.ancestorLabel}>{item.label}</span>;
}

export function Breadcrumb({
  'aria-label': ariaLabel = 'Breadcrumb',
  className,
  items,
  overflowLabel = 'Show hidden breadcrumb levels',
  ...props
}: BreadcrumbProps) {
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const currentIndex = items.length - 1;
  const hiddenItems = items.slice(1, currentIndex);

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
        <li
          className={[styles.item, currentIndex === 0 && styles.currentSegment]
            .filter(Boolean)
            .join(' ')}
        >
          {currentIndex === 0 ? (
            <span aria-current="page" className={styles.currentLabel}>
              {items[0].label}
            </span>
          ) : (
            <BreadcrumbLabel item={items[0]} />
          )}
        </li>

        {hiddenItems.length > 0 ? (
          <>
            <li aria-hidden="true" className={styles.compactOnly}>
              <ChevronRight size={14} strokeWidth={1.75} />
            </li>
            <li className={[styles.compactOnly, styles.overflowItem].join(' ')}>
              <button
                aria-controls={menuId}
                aria-expanded={isOverflowOpen}
                aria-haspopup="menu"
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
                type="button"
              >
                <Ellipsis size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>

              {isOverflowOpen ? (
                <div className={styles.overflowMenu} ref={menuContainerRef}>
                  <MenuWrapper
                    aria-label="Hidden breadcrumb levels"
                    id={menuId}
                    onEscape={() => closeOverflow({ restoreFocus: true })}
                  >
                    {hiddenItems.map((item, index) =>
                      item.href ? (
                        <a
                          className={styles.overflowLink}
                          href={item.href}
                          key={item.label}
                          onClick={() => closeOverflow()}
                          role="menuitem"
                          tabIndex={index === 0 ? 0 : -1}
                        >
                          {item.label}
                        </a>
                      ) : (
                        <button
                          className={styles.overflowLink}
                          key={item.label}
                          onClick={() => closeOverflow()}
                          role="menuitem"
                          tabIndex={index === 0 ? 0 : -1}
                          type="button"
                        >
                          {item.label}
                        </button>
                      ),
                    )}
                  </MenuWrapper>
                </div>
              ) : null}
            </li>
          </>
        ) : null}

        {items.slice(1).map((item, offset) => {
          const index = offset + 1;
          const isCurrent = index === currentIndex;
          const isIntermediate = index < currentIndex;

          return (
            <li
              className={[
                styles.pathSegment,
                isIntermediate && styles.intermediateSegment,
                isCurrent && styles.currentSegment,
              ]
                .filter(Boolean)
                .join(' ')}
              key={`${item.label}-${index}`}
            >
              <ChevronRight
                aria-hidden="true"
                className={styles.separator}
                size={14}
                strokeWidth={1.75}
              />
              {isCurrent ? (
                <span aria-current="page" className={styles.currentLabel}>
                  {item.label}
                </span>
              ) : (
                <BreadcrumbLabel item={item} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
