import { forwardRef } from 'react';
import { Link } from 'react-router-dom';

import type { NavigationLinkProps } from '@/shared/ui/navigation-link';

export const RouterNavigationLink = forwardRef<
  HTMLAnchorElement,
  NavigationLinkProps
>(function RouterNavigationLink({ href, ...props }, ref) {
  return <Link {...props} ref={ref} to={href} />;
});
