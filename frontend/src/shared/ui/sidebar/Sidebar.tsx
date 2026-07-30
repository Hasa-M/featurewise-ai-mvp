import {
  ArrowUpRight,
  Ellipsis,
  FileText,
  FolderClosed,
  FolderOpen,
  List,
  Plus,
} from 'lucide-react';
import { useRef, useState } from 'react';
import type {
  HTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react';

import { Accordion } from '../accordion';
import type {
  AccordionActionProps,
  AccordionActionVisibility,
  AccordionSelection,
} from '../accordion';
import { MenuItem } from '../menu';
import type { MenuItemLinkProps } from '../menu';
import { MenuPopover } from '../menu-popover';
import type { NavigationLinkComponent } from '../navigation-link';
import { useOverflowTitle } from '@/shared/model';

import styles from './Sidebar.module.css';

export const SIDEBAR_MIN_WIDTH = 160;
export const SIDEBAR_MAX_WIDTH = 640;
export const SIDEBAR_DEFAULT_WIDTH = 400;
export const SIDEBAR_RESIZE_STEP = 16;

type WithoutActionPresentation<T> = T extends AccordionActionProps
  ? Omit<T, 'icon' | 'visibility'>
  : never;

export type SidebarNavigationAction = WithoutActionPresentation<AccordionActionProps>;

export type SidebarMenuAction = {
  'aria-label': string;
  children: ReactNode;
};

type SidebarDisclosureItemBase = {
  defaultOpen?: boolean;
  emptyMessage?: string;
  expandedIcon?: ReactNode;
  icon?: ReactNode;
  id: string;
  label: string;
};

export type SidebarLeafItem = {
  href: string;
  icon?: ReactNode;
  id: string;
  label: string;
  linkProps?: Omit<
    MenuItemLinkProps,
    'children' | 'href' | 'leadingIcon' | 'selected'
  >;
  type: 'leaf';
};

export type SidebarGroupItem = SidebarDisclosureItemBase & {
  children: readonly SidebarNodeItem[];
  menuAction?: SidebarNavigationAction;
  menuContent?: SidebarMenuAction;
  pageAction: SidebarNavigationAction;
  type: 'group';
};

type SidebarNodeBase = SidebarDisclosureItemBase & {
  addAction?: SidebarNavigationAction;
  count?: number;
  listAction?: SidebarNavigationAction;
};

type SidebarNodeWithGroups = SidebarNodeBase & {
  children: readonly SidebarGroupItem[];
  type: 'node';
};

type SidebarNodeWithLeaves = SidebarNodeBase & {
  children: readonly SidebarLeafItem[];
  type: 'node';
};

export type SidebarNodeItem = SidebarNodeWithGroups | SidebarNodeWithLeaves;

export type SidebarProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
  activeItemId?: string;
  defaultWidth?: number;
  emptyMessage?: string;
  linkComponent?: NavigationLinkComponent;
  navigationLabel?: string;
  nodes: readonly SidebarNodeItem[];
  onItemOpenChange?: (itemId: string, open: boolean) => void;
  onWidthChange?: (width: number) => void;
  resizeLabel?: string;
  width?: number;
};

function clampSidebarWidth(value: number) {
  if (!Number.isFinite(value)) {
    return SIDEBAR_DEFAULT_WIDTH;
  }

  return Math.round(
    Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, value)),
  );
}

type ResizeOptions = Pick<
  SidebarProps,
  'defaultWidth' | 'onWidthChange' | 'width'
>;

function useSidebarResize({
  defaultWidth = SIDEBAR_DEFAULT_WIDTH,
  onWidthChange,
  width,
}: ResizeOptions) {
  const [uncontrolledWidth, setUncontrolledWidth] = useState(() =>
    clampSidebarWidth(defaultWidth),
  );
  const [isResizing, setIsResizing] = useState(false);
  const dragState = useRef<{
    pointerId: number;
    startClientX: number;
    startWidth: number;
  } | null>(null);
  const currentWidth = clampSidebarWidth(width ?? uncontrolledWidth);

  function updateWidth(nextWidth: number) {
    const clampedWidth = clampSidebarWidth(nextWidth);

    if (width === undefined) {
      setUncontrolledWidth(clampedWidth);
    }
    onWidthChange?.(clampedWidth);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    dragState.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startWidth: currentWidth,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setIsResizing(true);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragState.current;

    if (drag?.pointerId === event.pointerId) {
      updateWidth(drag.startWidth + event.clientX - drag.startClientX);
    }
  }

  function finishPointerResize(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragState.current?.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragState.current = null;
    setIsResizing(false);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey
      ? SIDEBAR_RESIZE_STEP * 4
      : SIDEBAR_RESIZE_STEP;
    const widths: Partial<Record<string, number>> = {
      ArrowLeft: currentWidth - step,
      ArrowRight: currentWidth + step,
      End: SIDEBAR_MAX_WIDTH,
      Home: SIDEBAR_MIN_WIDTH,
    };
    const nextWidth = widths[event.key];

    if (nextWidth !== undefined) {
      event.preventDefault();
      updateWidth(nextWidth);
    }
  }

  function onLostPointerCapture() {
    dragState.current = null;
    setIsResizing(false);
  }

  return {
    currentWidth,
    isResizing,
    resizeHandleProps: {
      onKeyDown,
      onLostPointerCapture,
      onPointerCancel: finishPointerResize,
      onPointerDown,
      onPointerMove,
      onPointerUp: finishPointerResize,
    },
  };
}

function DisclosureLabel({
  count,
  kind,
  label,
}: {
  count?: number;
  kind: 'group' | 'node';
  label: string;
}) {
  const overflowTitle = useOverflowTitle<HTMLSpanElement>();

  return (
    <span className={styles.itemIdentity}>
      <span
        {...overflowTitle}
        className={kind === 'node' ? styles.nodeLabel : styles.groupLabel}
      >
        {label}
      </span>
      {count !== undefined ? (
        <span aria-hidden="true" className={styles.count}>
          {count}
        </span>
      ) : null}
    </span>
  );
}

function folderIcon(isOpen: boolean) {
  return isOpen ? (
    <FolderOpen aria-hidden="true" size={16} strokeWidth={1.75} />
  ) : (
    <FolderClosed aria-hidden="true" size={16} strokeWidth={1.75} />
  );
}

function presentAction(
  action: SidebarNavigationAction,
  icon: ReactNode,
  visibility: AccordionActionVisibility,
): AccordionActionProps {
  if ('href' in action && action.href !== undefined) {
    return { ...action, icon, visibility };
  }

  return { ...action, icon, visibility };
}

function disclosureActions(
  item: SidebarGroupItem | SidebarNodeItem,
): readonly AccordionActionProps[] {
  if (item.type === 'node') {
    return [
      ...(item.listAction
        ? [
            presentAction(
              item.listAction,
              <List aria-hidden="true" size={16} strokeWidth={1.75} />,
              'hover',
            ),
          ]
        : []),
      ...(item.addAction
        ? [
            presentAction(
              item.addAction,
              <Plus aria-hidden="true" size={16} strokeWidth={1.75} />,
              'always',
            ),
          ]
        : []),
    ];
  }

  return [
    ...(item.menuAction
      ? [
          presentAction(
            item.menuAction,
            <Ellipsis aria-hidden="true" size={16} strokeWidth={1.75} />,
            'hover',
          ),
        ]
      : []),
    presentAction(
      item.pageAction,
      <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.75} />,
      'hover',
    ),
  ];
}

type SidebarTreeItem = SidebarGroupItem | SidebarLeafItem | SidebarNodeItem;

function containsActiveItem(
  item: SidebarTreeItem,
  activeItemId: string | undefined,
): boolean {
  if (activeItemId === undefined) {
    return false;
  }

  if (item.id === activeItemId) {
    return true;
  }

  return item.type === 'leaf'
    ? false
    : item.children.some((child) => containsActiveItem(child, activeItemId));
}

function accordionSelection(
  item: SidebarGroupItem | SidebarNodeItem,
  activeItemId: string | undefined,
): AccordionSelection {
  if (activeItemId === undefined) {
    return 'none';
  }

  if (item.id === activeItemId) {
    return 'current';
  }

  return item.children.some((child) =>
    containsActiveItem(child, activeItemId),
  )
    ? 'ancestor'
    : 'none';
}

type SidebarTreeProps = {
  activeItemId?: string;
  linkComponent?: NavigationLinkComponent;
  onItemOpenChange?: (itemId: string, open: boolean) => void;
};

type SidebarDisclosureProps = SidebarTreeProps & {
  children: ReactNode;
  item: SidebarGroupItem | SidebarNodeItem;
  kind: 'group' | 'node';
};

function SidebarDisclosure({
  activeItemId,
  children,
  item,
  kind,
  linkComponent,
  onItemOpenChange,
}: SidebarDisclosureProps) {
  const [isOpen, setIsOpen] = useState(
    item.defaultOpen ?? item.type === 'node',
  );
  const icon =
    (isOpen ? item.expandedIcon : undefined) ?? item.icon ?? folderIcon(isOpen);

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    onItemOpenChange?.(item.id, open);
  }

  return (
    <li className={styles.item}>
      <Accordion
        actionContent={
          item.type === 'group' && item.menuContent ? (
            <MenuPopover label={item.menuContent['aria-label']}>
              {item.menuContent.children}
            </MenuPopover>
          ) : undefined
        }
        actions={disclosureActions(item)}
        className={kind === 'node' ? styles.node : styles.group}
        label={
          <DisclosureLabel
            count={
              item.type === 'node'
                ? item.count ?? item.children.length
                : undefined
            }
            kind={kind}
            label={item.label}
          />
        }
        leadingIcon={icon}
        linkComponent={linkComponent}
        onOpenChange={handleOpenChange}
        open={isOpen}
        selection={accordionSelection(item, activeItemId)}
      >
        <div className={styles.branch}>
          {item.children.length > 0 ? (
            children
          ) : (
            <p className={styles.emptyBranch} role="status">
              {item.emptyMessage ?? 'No items yet'}
            </p>
          )}
        </div>
      </Accordion>
    </li>
  );
}

function SidebarLeaf({
  activeItemId,
  item,
  linkComponent,
}: Pick<SidebarTreeProps, 'activeItemId' | 'linkComponent'> & {
  item: SidebarLeafItem;
}) {
  const { className, ...linkProps } = item.linkProps ?? {};

  return (
    <li className={styles.item}>
      <MenuItem
        {...linkProps}
        className={[styles.leaf, className].filter(Boolean).join(' ')}
        href={item.href}
        leadingIcon={
          item.icon ?? (
            <FileText aria-hidden="true" size={16} strokeWidth={1.75} />
          )
        }
        linkComponent={linkComponent}
        selected={activeItemId === item.id}
      >
        {item.label}
      </MenuItem>
    </li>
  );
}

function SidebarGroup({
  activeItemId,
  item,
  linkComponent,
  onItemOpenChange,
}: SidebarTreeProps & { item: SidebarGroupItem }) {
  return (
    <SidebarDisclosure
      activeItemId={activeItemId}
      item={item}
      kind="group"
      linkComponent={linkComponent}
      onItemOpenChange={onItemOpenChange}
    >
      <SidebarNodeList
        activeItemId={activeItemId}
        linkComponent={linkComponent}
        nodes={item.children}
        onItemOpenChange={onItemOpenChange}
      />
    </SidebarDisclosure>
  );
}

function SidebarNode({
  activeItemId,
  item,
  linkComponent,
  onItemOpenChange,
}: SidebarTreeProps & { item: SidebarNodeItem }) {
  return (
    <SidebarDisclosure
      activeItemId={activeItemId}
      item={item}
      kind="node"
      linkComponent={linkComponent}
      onItemOpenChange={onItemOpenChange}
    >
      <ul className={styles.list}>
        {item.children.map((child) =>
          child.type === 'group' ? (
            <SidebarGroup
              activeItemId={activeItemId}
              item={child}
              key={child.id}
              linkComponent={linkComponent}
              onItemOpenChange={onItemOpenChange}
            />
          ) : (
            <SidebarLeaf
              activeItemId={activeItemId}
              item={child}
              key={child.id}
              linkComponent={linkComponent}
            />
          ),
        )}
      </ul>
    </SidebarDisclosure>
  );
}

function SidebarNodeList({
  activeItemId,
  linkComponent,
  nodes,
  onItemOpenChange,
}: SidebarTreeProps & { nodes: readonly SidebarNodeItem[] }) {
  return (
    <ul className={styles.list}>
      {nodes.map((node) => (
        <SidebarNode
        activeItemId={activeItemId}
        item={node}
        key={node.id}
        linkComponent={linkComponent}
          onItemOpenChange={onItemOpenChange}
        />
      ))}
    </ul>
  );
}

export function Sidebar({
  activeItemId,
  className,
  defaultWidth,
  emptyMessage = 'No items yet',
  linkComponent,
  navigationLabel = 'Workspace navigation',
  nodes,
  onItemOpenChange,
  onWidthChange,
  resizeLabel = 'Resize sidebar',
  style,
  width,
  ...props
}: SidebarProps) {
  const { currentWidth, isResizing, resizeHandleProps } = useSidebarResize({
    defaultWidth,
    onWidthChange,
    width,
  });

  return (
    <aside
      {...props}
      className={[styles.sidebar, className].filter(Boolean).join(' ')}
      data-resizing={isResizing ? 'true' : undefined}
      style={{ ...style, width: currentWidth }}
    >
      <nav aria-label={navigationLabel} className={styles.navigation}>
        {nodes.length > 0 ? (
          <SidebarNodeList
            activeItemId={activeItemId}
            linkComponent={linkComponent}
            nodes={nodes}
            onItemOpenChange={onItemOpenChange}
          />
        ) : (
          <p className={styles.emptyRoot} role="status">
            {emptyMessage}
          </p>
        )}
      </nav>
      <div
        {...resizeHandleProps}
        aria-label={resizeLabel}
        aria-orientation="vertical"
        aria-valuemax={SIDEBAR_MAX_WIDTH}
        aria-valuemin={SIDEBAR_MIN_WIDTH}
        aria-valuenow={currentWidth}
        aria-valuetext={`${currentWidth} pixels`}
        className={styles.resizeHandle}
        role="separator"
        tabIndex={0}
        title={resizeLabel}
      />
    </aside>
  );
}
