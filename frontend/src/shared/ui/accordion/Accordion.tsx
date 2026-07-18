import { ChevronRight } from 'lucide-react';
import { useId, useState } from 'react';
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from 'react';

import styles from './Accordion.module.css';

export type AccordionActionProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'children'
> & {
  'aria-label': string;
  icon: ReactNode;
  visibility?: AccordionActionVisibility;
};

export type AccordionActionVisibility = 'always' | 'hover';

export type AccordionProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
> & {
  actions?: readonly AccordionActionProps[];
  children: ReactNode;
  defaultOpen?: boolean;
  disabled?: boolean;
  label: ReactNode;
  leadingIcon?: ReactNode;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
};

export function Accordion({
  actions = [],
  children,
  className,
  defaultOpen = false,
  disabled = false,
  label,
  leadingIcon,
  onOpenChange,
  open,
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
          {leadingIcon ? (
            <span aria-hidden="true" className={styles.iconSlot}>
              {leadingIcon}
            </span>
          ) : null}
          <span className={styles.label}>{label}</span>
          <ChevronRight
            aria-hidden="true"
            className={styles.indicator}
            size={14}
            strokeWidth={1.75}
          />
        </button>
        {actions.length > 0 ? (
          <div className={styles.actions}>
            {actions.map((action, index) => {
              const {
                'aria-label': actionLabel,
                className: actionClassName,
                disabled: actionDisabled,
                icon: actionIcon,
                title: actionTitle,
                type: actionType = 'button',
                visibility = 'always',
                ...actionProps
              } = action;

              return (
                <button
                  {...actionProps}
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
                  <span aria-hidden="true" className={styles.iconSlot}>
                    {actionIcon}
                  </span>
                </button>
              );
            })}
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
