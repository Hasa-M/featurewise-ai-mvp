import { ChevronDown } from 'lucide-react';
import type {
  HTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
} from 'react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { MenuItem, MenuWrapper } from '../menu';
import { useOverflowTitle } from '@/shared/model';

import styles from './Tabs.module.css';

export type TabItem = {
  disabled?: boolean;
  icon?: ReactNode;
  id: string;
  info?: ReactNode;
  label: string;
  panelId?: string;
  tabId?: string;
};

export type TabsItems = readonly [TabItem, ...TabItem[]];

export type TabsProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  | 'aria-label'
  | 'aria-labelledby'
  | 'children'
  | 'defaultValue'
  | 'onChange'
> & {
  'aria-label': string;
  'aria-labelledby'?: string;
  defaultValue?: string;
  items: TabsItems;
  menuLabel?: string;
  moreLabel?: string;
  onValueChange?: (value: string) => void;
  value?: string;
};

function initialValue(items: TabsItems, defaultValue: string | undefined) {
  const defaultItem = items.find((item) => item.id === defaultValue);
  return (
    (defaultItem && !defaultItem.disabled ? defaultItem.id : undefined) ??
    items.find((item) => !item.disabled)?.id ??
    items[0].id
  );
}

function TabContent({ item }: { item: TabItem }) {
  const labelOverflowTitle = useOverflowTitle<HTMLSpanElement>();
  const infoOverflowTitle = useOverflowTitle<HTMLSpanElement>();

  return (
    <>
      {item.icon ? (
        <span aria-hidden="true" className={styles.icon}>
          {item.icon}
        </span>
      ) : null}
      <span {...labelOverflowTitle} className={styles.label}>
        {item.label}
      </span>
      {item.info !== undefined && item.info !== null ? (
        <span
          {...infoOverflowTitle}
          aria-hidden="true"
          className={styles.info}
        >
          {item.info}
        </span>
      ) : null}
    </>
  );
}

export function Tabs({
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  className,
  defaultValue,
  items,
  menuLabel = 'Hidden tabs',
  moreLabel = 'More tabs',
  onValueChange,
  value,
  ...props
}: TabsProps) {
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);
  const itemById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );
  const [uncontrolledValue, setUncontrolledValue] = useState(() =>
    initialValue(items, defaultValue),
  );
  const [preferredOrder, setPreferredOrder] = useState(() => itemIds);
  const [visibleCount, setVisibleCount] = useState(items.length);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const moreMeasureRef = useRef<HTMLDivElement>(null);
  const tabMeasureRefs = useRef(new Map<string, HTMLDivElement>());
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocusId = useRef<string | undefined>(undefined);
  const menuId = useId();

  const baseOrder = useMemo(
    () => [
      ...preferredOrder.filter((id) => itemById.has(id)),
      ...itemIds.filter((id) => !preferredOrder.includes(id)),
    ],
    [itemById, itemIds, preferredOrder],
  );
  const controlledItem = value ? itemById.get(value) : undefined;
  const uncontrolledItem = itemById.get(uncontrolledValue);
  const selectedValue =
    controlledItem?.id ??
    uncontrolledItem?.id ??
    initialValue(items, defaultValue);
  const effectiveVisibleCount = Math.max(
    1,
    Math.min(visibleCount, baseOrder.length),
  );
  const displayOrder = useMemo(() => {
    const nextOrder = [...baseOrder];
    const selectedIndex = nextOrder.indexOf(selectedValue);

    if (selectedIndex >= effectiveVisibleCount) {
      const replacementIndex = effectiveVisibleCount - 1;
      [nextOrder[replacementIndex], nextOrder[selectedIndex]] = [
        nextOrder[selectedIndex],
        nextOrder[replacementIndex],
      ];
    }

    return nextOrder;
  }, [baseOrder, effectiveVisibleCount, selectedValue]);
  const visibleIds = displayOrder.slice(0, effectiveVisibleCount);
  const hiddenIds = displayOrder.slice(effectiveVisibleCount);
  const isOverflowing = hiddenIds.length > 0;
  const isMenuOpen = isMoreOpen && isOverflowing;

  const measureTabs = useCallback(() => {
    const availableWidth = barRef.current?.clientWidth ?? 0;
    const measuredWidths = displayOrder.map(
      (id) => tabMeasureRefs.current.get(id)?.getBoundingClientRect().width ?? 0,
    );

    if (
      availableWidth <= 0 ||
      measuredWidths.some((measuredWidth) => measuredWidth <= 0)
    ) {
      return;
    }

    const tabsWidth = measuredWidths.reduce(
      (total, measuredWidth) => total + measuredWidth,
      0,
    );
    let nextVisibleCount = displayOrder.length;

    if (tabsWidth > availableWidth) {
      const moreWidth =
        moreMeasureRef.current?.getBoundingClientRect().width ?? 0;
      const tabsCapacity = Math.max(0, availableWidth - moreWidth);
      let occupiedWidth = 0;
      nextVisibleCount = 0;

      for (const measuredWidth of measuredWidths) {
        if (
          nextVisibleCount > 0 &&
          occupiedWidth + measuredWidth > tabsCapacity
        ) {
          break;
        }

        occupiedWidth += measuredWidth;
        nextVisibleCount += 1;
      }

      nextVisibleCount = Math.max(1, nextVisibleCount);
    }

    setVisibleCount((currentCount) =>
      currentCount === nextVisibleCount ? currentCount : nextVisibleCount,
    );
    if (nextVisibleCount === displayOrder.length) {
      setIsMoreOpen(false);
    }
  }, [displayOrder]);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const initialMeasurement = window.setTimeout(measureTabs, 0);
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(measureTabs);
    observer?.observe(bar);
    window.addEventListener('resize', measureTabs);
    void document.fonts?.ready.then(measureTabs);

    return () => {
      window.clearTimeout(initialMeasurement);
      observer?.disconnect();
      window.removeEventListener('resize', measureTabs);
    };
  }, [measureTabs]);

  useEffect(() => {
    const focusId = pendingFocusId.current;
    if (!focusId) return;

    const frame = window.requestAnimationFrame(() => {
      tabRefs.current.get(focusId)?.focus();
      pendingFocusId.current = undefined;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [displayOrder]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const frame = window.requestAnimationFrame(() => {
      menuContainerRef.current
        ?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')
        ?.focus();
    });

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setIsMoreOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isMenuOpen]);

  function selectTab(id: string) {
    const item = itemById.get(id);
    if (!item || item.disabled || id === selectedValue) return;

    if (value === undefined) {
      setUncontrolledValue(id);
    }
    onValueChange?.(id);
  }

  function handleTabKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    currentId: string,
  ) {
    const enabledIds = visibleIds.filter(
      (id) => !itemById.get(id)?.disabled,
    );
    const currentIndex = enabledIds.indexOf(currentId);
    let nextId: string | undefined;

    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      nextId =
        enabledIds[
          (currentIndex + direction + enabledIds.length) % enabledIds.length
        ];
    } else if (event.key === 'Home') {
      nextId = enabledIds[0];
    } else if (event.key === 'End') {
      nextId = enabledIds.at(-1);
    }

    if (!nextId) return;
    event.preventDefault();
    tabRefs.current.get(nextId)?.focus();
    selectTab(nextId);
  }

  function selectHiddenTab(id: string) {
    const hiddenIndex = baseOrder.indexOf(id);
    const replacementIndex = effectiveVisibleCount - 1;

    if (hiddenIndex >= effectiveVisibleCount) {
      const nextOrder = [...baseOrder];
      [nextOrder[replacementIndex], nextOrder[hiddenIndex]] = [
        nextOrder[hiddenIndex],
        nextOrder[replacementIndex],
      ];
      setPreferredOrder(nextOrder);
    }

    pendingFocusId.current = id;
    selectTab(id);
    setIsMoreOpen(false);
  }

  const focusableId =
    visibleIds.find(
      (id) => id === selectedValue && !itemById.get(id)?.disabled,
    ) ?? visibleIds.find((id) => !itemById.get(id)?.disabled);

  return (
    <div
      {...props}
      className={[styles.root, className].filter(Boolean).join(' ')}
      ref={rootRef}
    >
      <div className={styles.bar} data-tabs-bar="" ref={barRef}>
        <div
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          className={styles.tabList}
          role="tablist"
        >
          {visibleIds.map((id) => {
            const item = itemById.get(id);
            if (!item) return null;

            return (
              <button
                aria-controls={item.panelId}
                aria-label={item.label}
                aria-selected={item.id === selectedValue}
                className={styles.tab}
                disabled={item.disabled}
                id={item.tabId}
                key={item.id}
                onClick={() => selectTab(item.id)}
                onKeyDown={(event) => handleTabKeyDown(event, item.id)}
                ref={(node) => {
                  if (node) {
                    tabRefs.current.set(item.id, node);
                  } else {
                    tabRefs.current.delete(item.id);
                  }
                }}
                role="tab"
                tabIndex={item.id === focusableId ? 0 : -1}
                type="button"
              >
                <TabContent item={item} />
              </button>
            );
          })}
        </div>

        {isOverflowing ? (
          <span className={styles.more}>
            <button
              aria-controls={menuId}
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
              className={styles.moreTrigger}
              onClick={() => setIsMoreOpen((isOpen) => !isOpen)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown' && !isMenuOpen) {
                  event.preventDefault();
                  setIsMoreOpen(true);
                } else if (event.key === 'ArrowLeft') {
                  event.preventDefault();
                  const lastEnabledId = [...visibleIds]
                    .reverse()
                    .find((id) => !itemById.get(id)?.disabled);
                  if (lastEnabledId) {
                    tabRefs.current.get(lastEnabledId)?.focus();
                  }
                }
              }}
              ref={moreTriggerRef}
              type="button"
            >
              <span>{moreLabel}</span>
              <ChevronDown
                aria-hidden="true"
                className={styles.chevron}
                size={15}
                strokeWidth={1.75}
              />
            </button>

            {isMenuOpen ? (
              <div className={styles.menu} ref={menuContainerRef}>
                <MenuWrapper
                  aria-label={menuLabel}
                  id={menuId}
                  onEscape={() => {
                    setIsMoreOpen(false);
                    moreTriggerRef.current?.focus();
                  }}
                >
                  {hiddenIds.map((id) => {
                    const item = itemById.get(id);
                    if (!item) return null;

                    return (
                      <MenuItem
                        aria-label={item.label}
                        disabled={item.disabled}
                        key={item.id}
                        leadingIcon={item.icon}
                        onClick={() => selectHiddenTab(item.id)}
                        selected={item.id === selectedValue}
                        trailingIcon={
                          item.info !== undefined && item.info !== null ? (
                            <span className={styles.menuInfo}>{item.info}</span>
                          ) : undefined
                        }
                      >
                        {item.label}
                      </MenuItem>
                    );
                  })}
                </MenuWrapper>
              </div>
            ) : null}
          </span>
        ) : null}
      </div>

      <div aria-hidden="true" className={styles.measurement}>
        {items.map((item) => (
          <div
            className={[styles.tab, styles.measurementTab].join(' ')}
            data-measure-kind="tab"
            key={item.id}
            ref={(node) => {
              if (node) {
                tabMeasureRefs.current.set(item.id, node);
              } else {
                tabMeasureRefs.current.delete(item.id);
              }
            }}
          >
            <TabContent item={item} />
          </div>
        ))}
        <div
          className={[styles.moreTrigger, styles.measurementTab].join(' ')}
          data-measure-kind="more"
          ref={moreMeasureRef}
        >
          <span>{moreLabel}</span>
          <ChevronDown aria-hidden="true" size={15} strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}
