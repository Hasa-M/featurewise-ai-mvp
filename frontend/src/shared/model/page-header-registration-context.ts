import { createContext } from 'react';

import type { PageHeaderProps } from '@/shared/ui/page-header';

export interface PageHeaderRegistrationActions {
  clear(owner: symbol): void;
  register(owner: symbol, props: PageHeaderProps): void;
}

export const PageHeaderRegistrationContext =
  createContext<PageHeaderRegistrationActions | null>(null);
export const RegisteredPageHeaderContext = createContext<
  PageHeaderProps | undefined
>(undefined);

