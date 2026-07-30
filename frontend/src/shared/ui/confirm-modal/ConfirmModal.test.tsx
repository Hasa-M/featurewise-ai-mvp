import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmModal } from './ConfirmModal';

describe('ConfirmModal', () => {
  it('reports the explicit confirmation action', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmModal
        confirmLabel='Delete feature'
        description='The feature workspace will no longer be available.'
        onConfirm={onConfirm}
        onOpenChange={() => undefined}
        open
        title='Delete feature?'
        variant='danger'
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Delete feature' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('keeps pending destructive actions non-dismissible', () => {
    render(
      <ConfirmModal
        confirmLabel='Delete feature'
        onConfirm={() => undefined}
        onOpenChange={() => undefined}
        open
        pending
        title='Delete feature?'
        variant='danger'
      />,
    );

    expect(screen.queryByRole('button', { name: 'Close modal' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});

