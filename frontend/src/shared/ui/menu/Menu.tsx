import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
  KeyboardEvent,
  ReactNode,
} from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import styles from './Menu.module.css';

type MenuContextValue = {
  activeItemId: string | undefined;
  registerItem: (id: string) => () => void;
  setActiveItemId: (id: string) => void;
};

const MenuContext = createContext<MenuContextValue | null>(null);

type AccessibleMenuName =
  | { 'aria-label': string; 'aria-labelledby'?: string }
  | { 'aria-label'?: string; 'aria-labelledby': string };

export type MenuWrapperProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'aria-label' | 'aria-labelledby'
> &
  AccessibleMenuName & {
    onEscape?: () => void;
  };

export function MenuWrapper({
  children,
  className,
  onEscape,
  onKeyDown,
  ...props
}: MenuWrapperProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const itemIdsRef = useRef<string[]>([]);
  const [activeItemId, setActiveItemId] = useState<string>();

  const registerItem = useCallback((id: string) => {
    itemIdsRef.current = [...itemIdsRef.current, id];
    setActiveItemId((current) => current ?? id);

    return () => {
      itemIdsRef.current = itemIdsRef.current.filter((itemId) => itemId !== id);
      setActiveItemId((current) =>
        current === id ? itemIdsRef.current[0] : current,
      );
    };
  }, []);

  function getEnabledItems() {
    return Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not(:disabled):not([aria-disabled="true"])',
      ) ?? [],
    );
  }

  function focusItem(item: HTMLElement | undefined) {
    if (!item) return;
    setActiveItemId(item.id);
    item.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    const items = getEnabledItems();
    const currentIndex = items.findIndex((item) => item === document.activeElement);

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex =
        currentIndex < 0
          ? direction === 1
            ? 0
            : items.length - 1
          : (currentIndex + direction + items.length) % items.length;
      focusItem(items[nextIndex]);
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      focusItem(event.key === 'Home' ? items[0] : items.at(-1));
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      onEscape?.();
      return;
    }

    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const query = event.key.toLocaleLowerCase();
      const orderedItems = [
        ...items.slice(currentIndex + 1),
        ...items.slice(0, currentIndex + 1),
      ];
      const match = orderedItems.find((item) =>
        item.textContent?.trim().toLocaleLowerCase().startsWith(query),
      );
      if (match) {
        event.preventDefault();
        focusItem(match);
      }
    }
  }

  return (
    <MenuContext.Provider
      value={{ activeItemId, registerItem, setActiveItemId }}
    >
      <div
        {...props}
        className={[styles.menu, className].filter(Boolean).join(' ')}
        onKeyDown={handleKeyDown}
        ref={menuRef}
        role="menu"
      >
        {children}
      </div>
    </MenuContext.Provider>
  );
}

export type MenuSectionProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  title?: ReactNode;
};

export function MenuSection({
  children,
  className,
  title,
  ...props
}: MenuSectionProps) {
  const titleId = useId();

  return (
    <div
      {...props}
      aria-labelledby={title ? titleId : props['aria-labelledby']}
      className={[styles.section, className].filter(Boolean).join(' ')}
      role="group"
    >
      {title ? (
        <div className={styles.sectionTitle} id={titleId}>
          {title}
        </div>
      ) : null}
      <div className={styles.sectionItems}>{children}</div>
    </div>
  );
}

export type MenuItemVariant = 'default' | 'danger';

type MenuItemBaseProps = {
  children: ReactNode;
  disabled?: boolean;
  leadingIcon?: ReactNode;
  selected?: boolean;
  trailingIcon?: ReactNode;
  variant?: MenuItemVariant;
};

export type MenuItemButtonProps = MenuItemBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
    href?: never;
  };

export type MenuItemLinkProps = MenuItemBaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'href'> & {
    href: string;
  };

export type MenuItemProps = MenuItemButtonProps | MenuItemLinkProps;

function MenuItemContent({
  children,
  leadingIcon,
  trailingIcon,
}: Pick<MenuItemBaseProps, 'children' | 'leadingIcon' | 'trailingIcon'>) {
  return (
    <>
      {leadingIcon ? (
        <span aria-hidden="true" className={styles.iconSlot}>
          {leadingIcon}
        </span>
      ) : null}
      <span className={styles.itemLabel}>{children}</span>
      {trailingIcon ? (
        <span aria-hidden="true" className={styles.iconSlot}>
          {trailingIcon}
        </span>
      ) : null}
    </>
  );
}

export function MenuItem(props: MenuItemProps) {
  const { selected = false, variant = 'default', ...nativeProps } = props;
  const context = useContext(MenuContext);
  const activeItemId = context?.activeItemId;
  const registerItem = context?.registerItem;
  const setActiveItemId = context?.setActiveItemId;
  const generatedId = useId();
  const id = nativeProps.id ?? generatedId;
  const className = [styles.item, styles[variant], nativeProps.className]
    .filter(Boolean)
    .join(' ');

  useEffect(() => registerItem?.(id), [id, registerItem]);

  if ('href' in nativeProps && nativeProps.href !== undefined) {
    const {
      'aria-current': ariaCurrent,
      children,
      disabled = false,
      href,
      leadingIcon,
      onClick,
      onFocus,
      tabIndex,
      trailingIcon,
      ...linkProps
    } = nativeProps;

    return (
      <a
        {...linkProps}
        aria-current={selected ? 'page' : ariaCurrent}
        aria-disabled={disabled || undefined}
        className={className}
        data-selected={selected ? 'true' : undefined}
        href={href}
        id={id}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault();
            return;
          }
          onClick?.(event);
        }}
        onFocus={(event) => {
          setActiveItemId?.(id);
          onFocus?.(event);
        }}
        role={context ? 'menuitem' : undefined}
        tabIndex={
          context ? (activeItemId === id ? 0 : -1) : disabled ? -1 : tabIndex
        }
      >
        <MenuItemContent
          leadingIcon={leadingIcon}
          trailingIcon={trailingIcon}
        >
          {children}
        </MenuItemContent>
      </a>
    );
  }

  const {
    'aria-current': ariaCurrent,
    children,
    leadingIcon,
    onFocus,
    tabIndex,
    trailingIcon,
    type = 'button',
    ...buttonProps
  } = nativeProps;

  return (
    <button
      {...buttonProps}
      aria-current={selected ? 'page' : ariaCurrent}
      className={className}
      data-selected={selected ? 'true' : undefined}
      id={id}
      onFocus={(event) => {
        setActiveItemId?.(id);
        onFocus?.(event);
      }}
      role={context ? 'menuitem' : undefined}
      tabIndex={context ? (activeItemId === id ? 0 : -1) : tabIndex}
      type={type}
    >
      <MenuItemContent
        leadingIcon={leadingIcon}
        trailingIcon={trailingIcon}
      >
        {children}
      </MenuItemContent>
    </button>
  );
}

export type MenuDividerProps = HTMLAttributes<HTMLDivElement>;

export function MenuDivider({ className, ...props }: MenuDividerProps) {
  return (
    <div
      {...props}
      className={[styles.divider, className].filter(Boolean).join(' ')}
      role="separator"
    />
  );
}
