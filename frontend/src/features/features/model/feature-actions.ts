import { createContext, useContext } from 'react';

import type { Feature } from './features';

export type FeatureCreateSuccessBehavior = 'open-created' | 'stay';
export type FeatureDeleteSuccessBehavior = 'parent-if-current' | 'stay';

export interface FeatureActionsContextValue {
  openCreate(options: {
    readonly projectId: string;
    readonly successBehavior?: FeatureCreateSuccessBehavior;
  }): void;
  openDelete(
    feature: Feature,
    options?: {
      readonly successBehavior?: FeatureDeleteSuccessBehavior;
    },
  ): void;
  openEdit(feature: Feature): void;
}

export const FeatureActionsContext =
  createContext<FeatureActionsContextValue | null>(null);

export function useFeatureActions() {
  const context = useContext(FeatureActionsContext);

  if (context === null) {
    throw new Error(
      'useFeatureActions must be used within FeatureActionsProvider',
    );
  }

  return context;
}

