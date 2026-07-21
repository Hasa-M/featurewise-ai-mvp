import type { ImgHTMLAttributes } from 'react';

import logoIcon from '../../../assets/logo-icon.svg';
import logoWordmarkDark from '../../../assets/logo-wordmark-dark.svg';
import logoWordmark from '../../../assets/logo-wordmark.svg';
import styles from './Logo.module.css';

export type LogoVariant = 'wordmark' | 'icon';
export type LogoTone = 'default' | 'inverse';
export type LogoSize = 'small' | 'medium' | 'large';

export type LogoProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'height' | 'src' | 'width'
> & {
  variant?: LogoVariant;
  tone?: LogoTone;
  size?: LogoSize;
};

export function Logo({
  alt = 'Featurewise',
  className,
  size = 'medium',
  tone = 'default',
  variant = 'wordmark',
  ...props
}: LogoProps) {
  const isIcon = variant === 'icon';
  const src = isIcon
    ? logoIcon
    : tone === 'inverse'
      ? logoWordmarkDark
      : logoWordmark;
  const classes = [styles.logo, styles[size], className]
    .filter(Boolean)
    .join(' ');

  return (
    <img
      {...props}
      alt={alt}
      className={classes}
      height={isIcon ? 32 : 34}
      src={src}
      width={isIcon ? 32 : 148}
    />
  );
}
