import { useCallback, useMemo, useState, type ReactNode } from 'react';

import type { PageHeaderProps } from '@/shared/ui/page-header';

import {
  PageHeaderRegistrationContext,
  RegisteredPageHeaderContext,
} from './page-header-registration-context';

interface PageHeaderEntry {
  readonly owner: symbol;
  readonly props: PageHeaderProps;
}

export function PageHeaderRegistrationProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const [entry, setEntry] = useState<PageHeaderEntry>();
  const register = useCallback((owner: symbol, props: PageHeaderProps) => {
    setEntry({ owner, props });
  }, []);
  const clear = useCallback((owner: symbol) => {
    setEntry((current) => (current?.owner === owner ? undefined : current));
  }, []);
  const actions = useMemo(() => ({ clear, register }), [clear, register]);

  return (
    <PageHeaderRegistrationContext.Provider value={actions}>
      <RegisteredPageHeaderContext.Provider value={entry?.props}>
        {children}
      </RegisteredPageHeaderContext.Provider>
    </PageHeaderRegistrationContext.Provider>
  );
}

