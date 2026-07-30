import { ChevronRight } from 'lucide-react';
import { useId, useState } from 'react';
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from 'react';

import {
  NativeNavigationLink,
  type NavigationLinkComponent,
} from '../navigation-link';
import styles from './Accordion.module.css';

type AccordionActionBase = {
  'aria-label': string;
  icon: ReactNode;
  visibility?: AccordionActionVisibility;
};

export type AccordionButtonActionProps = AccordionActionBase &
  Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'aria-label' | 'children'
  > & {
    href?: never;
  };

export type AccordionLinkActionProps = AccordionActionBase &
  Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    'aria-label' | 'children' | 'href'
  > & {
    href: string;
  };

export type AccordionActionProps =
  | AccordionButtonActionProps
  | AccordionLinkActionProps;

export type AccordionActionVisibility = 'always' | 'hover';
export type AccordionSelection = 'ancestor' | 'current' | 'none';

export type AccordionProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
> & {
  actionContent?: ReactNode;
  actions?: readonly AccordionActionProps[];
  children: ReactNode;
  defaultOpen?: boolean;
  disabled?: boolean;
  label: ReactNode;
  leadingIcon?: ReactNode;
  linkComponent?: NavigationLinkComponent;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  selection?: AccordionSelection;
};

function AccordionIcon({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className={styles.iconSlot}>
      {children}
    </span>
  );
}

export function Accordion({
  actionContent,
  actions = [],
  children,
  className,
  defaultOpen = false,
  disabled = false,
  label,
  leadingIcon,
  linkComponent: LinkComponent = NativeNavigationLink,
  onOpenChange,
  open,
  selection = 'none',
  ...props
}: AccordionProps) {
  const generatedId = useId();
  const triggerId = `${generatedId}-trigger`;
  const contentId = `${generatedId}-content`;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const isOpen = open ?? uncontrolledOpen;

  function toggle() {
    const nextOpen = !isOpen;

    if (!isControlled) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  }

  return (
    <div
      {...props}
      className={[styles.root, className].filter(Boolean).join(' ')}
      data-disabled={disabled ? 'true' : undefined}
      data-open={isOpen ? 'true' : 'false'}
      data-selection={selection === 'none' ? undefined : selection}
    >
      <div className={styles.header}>
        <button
          aria-controls={contentId}
          aria-expanded={isOpen}
          className={styles.trigger}
          disabled={disabled}
          id={triggerId}
          onClick={toggle}
          type="button"
        >
          {leadingIcon ? <AccordionIcon>{leadingIcon}</AccordionIcon> : null}
          <span className={styles.label}>{label}</span>
          <ChevronRight
            aria-hidden="true"
            className={styles.indicator}
            size={14}
            strokeWidth={1.75}
          />
        </button>
        {actions.length > 0 || actionContent ? (
          <div className={styles.actions}>
            {actions.map((action, index) => {
              if ('href' in action && action.href !== undefined) {
                const {
                  'aria-label': actionLabel,
                  className: actionClassName,
                  href,
                  icon: actionIcon,
                  onClick,
                  title: actionTitle,
                  visibility = 'always',
                  ...linkProps
                } = action;

                return (
                  <LinkComponent
                    {...linkProps}
                    aria-disabled={disabled || undefined}
                    aria-label={actionLabel}
                    className={[styles.action, actionClassName]
                      .filter(Boolean)
                      .join(' ')}
                    data-visibility={visibility}
                    href={href}
                    key={`${actionLabel}-${index}`}
                    onClick={(event) => {
                      if (disabled) {
                        event.preventDefault();
                        return;
                      }
                      onClick?.(event);
                    }}
                    title={actionTitle ?? actionLabel}
                  >
                    <AccordionIcon>{actionIcon}</AccordionIcon>
                  </LinkComponent>
                );
              }

              const {
                'aria-label': actionLabel,
                className: actionClassName,
                disabled: actionDisabled,
                icon: actionIcon,
                title: actionTitle,
                type: actionType = 'button',
                visibility = 'always',
                ...buttonProps
              } = action;

              return (
                <button
                  {...buttonProps}
                  aria-label={actionLabel}
                  className={[styles.action, actionClassName]
                    .filter(Boolean)
                    .join(' ')}
                  data-visibility={visibility}
                  disabled={disabled || actionDisabled}
                  key={`${actionLabel}-${index}`}
                  title={actionTitle ?? actionLabel}
                  type={actionType}
                >
                  <AccordionIcon>{actionIcon}</AccordionIcon>
                </button>
              );
            })}
            {actionContent}
          </div>
        ) : null}
      </div>
      <div
        aria-labelledby={triggerId}
        className={styles.content}
        hidden={!isOpen}
        id={contentId}
        role="region"
      >
        {children}
      </div>
    </div>
  );
}
