import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRepositoryAttemptExpiry } from './use-repository-attempt-expiry';

describe('connection attempt expiry', () => {
  afterEach(() => vi.useRealTimers());

  it('refreshes once at expiry without polling', async () => {
    vi.useFakeTimers();
    const refresh = vi.fn();
    renderHook(() =>
      useRepositoryAttemptExpiry(
        new Date(Date.now() + 10_000).toISOString(),
        refresh,
      ),
    );
    await vi.advanceTimersByTimeAsync(9_000);
    expect(refresh).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1_100);
    expect(refresh).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('cancels the old deadline when an attempt changes or the panel unmounts', async () => {
    vi.useFakeTimers();
    const refresh = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ expiresAt }) => useRepositoryAttemptExpiry(expiresAt, refresh),
      {
        initialProps: { expiresAt: new Date(Date.now() + 1_000).toISOString() },
      },
    );
    rerender({ expiresAt: new Date(Date.now() + 10_000).toISOString() });
    await vi.advanceTimersByTimeAsync(1_100);
    expect(refresh).not.toHaveBeenCalled();
    unmount();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(refresh).not.toHaveBeenCalled();
  });
});
