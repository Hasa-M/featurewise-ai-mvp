import { useContext, useLayoutEffect, useRef } from 'react';

import type { PageHeaderProps } from '@/shared/ui/page-header';

import {
  PageHeaderRegistrationContext,
  RegisteredPageHeaderContext,
} from './page-header-registration-context';

export function usePageHeaderRegistration(props: PageHeaderProps) {
  const actions = useContext(PageHeaderRegistrationContext);
  const ownerRef = useRef(Symbol('route-page-header'));

  if (actions === null) {
    throw new Error(
      'usePageHeaderRegistration must be used within PageHeaderRegistrationProvider',
    );
  }

  useLayoutEffect(() => {
    const owner = ownerRef.current;
    actions.register(owner, props);
    return () => actions.clear(owner);
  }, [actions, props]);
}

export function useRegisteredPageHeader() {
  return useContext(RegisteredPageHeaderContext);
}

