import { forwardRef } from 'react';
import type {
  AnchorHTMLAttributes,
  ForwardRefExoticComponent,
  ReactNode,
  RefAttributes,
} from 'react';

export type NavigationLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'children' | 'href'
> & {
  children?: ReactNode;
  href: string;
};

export type NavigationLinkComponent = ForwardRefExoticComponent<
  NavigationLinkProps & RefAttributes<HTMLAnchorElement>
>;

export const NativeNavigationLink = forwardRef<
  HTMLAnchorElement,
  NavigationLinkProps
>(function NativeNavigationLink({ children, href, ...props }, ref) {
  return (
    <a {...props} href={href} ref={ref}>
      {children}
    </a>
  );
});
