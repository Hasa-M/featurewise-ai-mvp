import type {
  CSSProperties,
  HTMLAttributes,
  MouseEventHandler,
  ReactNode,
} from 'react';

import styles from './Card.module.css';

export type CardProps = Omit<
  HTMLAttributes<HTMLElement>,
  'children' | 'onClick'
> & {
  children: ReactNode;
  disabled?: boolean;
  height?: CSSProperties['height'];
  onClick?: MouseEventHandler<HTMLButtonElement>;
  width?: CSSProperties['width'];
};

function getCardStyle(
  style: CSSProperties | undefined,
  width: CSSProperties['width'],
  height: CSSProperties['height'],
) {
  return {
    ...style,
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
  };
}

export function Card(props: CardProps) {
  const {
    children,
    className,
    disabled,
    height,
    onClick,
    style,
    width,
    ...elementProps
  } = props;
  const cardStyle = getCardStyle(style, width, height);

  if (onClick) {
    return (
      <button
        {...elementProps}
        className={[styles.card, styles.interactive, className]
          .filter(Boolean)
          .join(' ')}
        disabled={disabled}
        onClick={onClick}
        style={cardStyle}
        type="button"
      >
        {children}
      </button>
    );
  }

  return (
    <div
      {...elementProps}
      aria-disabled={disabled || undefined}
      className={[styles.card, className].filter(Boolean).join(' ')}
      style={cardStyle}
    >
      {children}
    </div>
  );
}
