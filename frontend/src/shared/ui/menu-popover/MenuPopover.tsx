import { Ellipsis } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { Button } from '../button';
import { MenuWrapper } from '../menu';
import styles from './MenuPopover.module.css';

export type MenuPopoverProps = {
  align?: 'end' | 'start';
  children: ReactNode;
  label: string;
};

export function MenuPopover({ align = 'end', children, label }: MenuPopoverProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) {
      rootRef.current
        ?.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')
        ?.focus();
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    rootRef.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus();

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        close();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [close, open]);

  return (
    <div className={styles.root} ref={rootRef}>
      <Button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup='menu'
        aria-label={label}
        isIcon
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        size='small'
        title={label}
        variant='ghost'
      >
        <Ellipsis aria-hidden='true' size={16} strokeWidth={1.75} />
      </Button>
      {open ? (
        <div
          className={styles.panel}
          data-align={align}
          onClick={(event) => {
            if (event.target instanceof Element && event.target.closest('[role=menuitem]')) {
              close();
            }
          }}
        >
          <MenuWrapper aria-label={label} id={menuId} onEscape={() => close(true)}>
            {children}
          </MenuWrapper>
        </div>
      ) : null}
    </div>
  );
}
