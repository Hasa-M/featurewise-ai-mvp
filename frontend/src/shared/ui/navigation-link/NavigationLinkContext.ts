import { createContext, useContext } from 'react';

import {
  NativeNavigationLink,
  type NavigationLinkComponent,
} from './NavigationLink';

export const NavigationLinkContext = createContext<NavigationLinkComponent>(
  NativeNavigationLink,
);

export function useNavigationLinkComponent() {
  return useContext(NavigationLinkContext);
}
