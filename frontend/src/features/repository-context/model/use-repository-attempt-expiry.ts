import { useEffect } from 'react';

// One refresh at the server-provided deadline; no background polling.
export function useRepositoryAttemptExpiry(
  expiresAt: string | undefined,
  refresh: () => unknown,
) {
  useEffect(() => {
    if (!expiresAt) return;
    const deadline = Date.parse(expiresAt);
    if (!Number.isFinite(deadline)) return;
    const timer = window.setTimeout(
      () => {
        void refresh();
      },
      Math.max(0, deadline - Date.now()) + 100,
    );
    return () => window.clearTimeout(timer);
  }, [expiresAt, refresh]);
}
