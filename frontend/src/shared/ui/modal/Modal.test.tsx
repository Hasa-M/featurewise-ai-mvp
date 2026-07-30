import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '../button';
import { Modal } from './Modal';

function DismissibleModal({
  onOpenChange = () => undefined,
}: {
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Modal
      actions={
        <>
          <Button onClick={() => setOpen(false)} variant="secondary">
            Keep feature
          </Button>
          <Button variant="danger">Delete feature</Button>
        </>
      }
      description="This action cannot be undone."
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        onOpenChange(nextOpen);
      }}
      open={open}
      size="small"
      title="Delete feature?"
    >
      The current valid spec will also be removed.
    </Modal>
  );
}

describe('Modal', () => {
  it('provides a labelled modal with descriptive content and custom actions', () => {
    render(<DismissibleModal />);

    const dialog = screen.getByRole('dialog', { name: 'Delete feature?' });
    expect(dialog).toHaveAccessibleDescription('This action cannot be undone.');
    expect(
      screen.getByText('The current valid spec will also be removed.'),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Keep feature' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Delete feature' }),
    ).toBeVisible();
  });

  it('dismisses from the close control and reports the controlled state change', async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<DismissibleModal onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole('button', { name: 'Close modal' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('dismisses on the native cancel event and backdrop click', () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <Modal
        onOpenChange={onOpenChange}
        open
        title="Generation settings"
      />,
    );

    const firstDialog = screen.getByRole('dialog', {
      name: 'Generation settings',
    });
    expect(
      fireEvent(firstDialog, new Event('cancel', { cancelable: true })),
    ).toBe(false);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);

    rerender(
      <Modal
        onOpenChange={onOpenChange}
        open
        title="Generation settings"
      />,
    );
    fireEvent.click(
      screen.getByRole('dialog', { name: 'Generation settings' }),
    );
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(onOpenChange).toHaveBeenCalledTimes(2);
  });

  it('can require an explicit action without exposing dismissal controls', () => {
    const onOpenChange = vi.fn();
    render(
      <Modal
        dismissible={false}
        onOpenChange={onOpenChange}
        open
        title="Resolve context conflict"
      />,
    );

    const dialog = screen.getByRole('dialog', {
      name: 'Resolve context conflict',
    });
    expect(
      screen.queryByRole('button', { name: 'Close modal' }),
    ).not.toBeInTheDocument();

    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    fireEvent.click(dialog);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('supports an explicit initial focus target and restores prior focus', async () => {
    function FocusExample() {
      const [open, setOpen] = useState(false);
      const fieldRef = useRef<HTMLInputElement>(null);

      return (
        <>
          <button onClick={() => setOpen(true)} type="button">
            Edit feature
          </button>
          <Modal
            initialFocusRef={fieldRef}
            onOpenChange={setOpen}
            open={open}
            title="Edit feature"
          >
            <label>
              Feature name
              <input ref={fieldRef} />
            </label>
          </Modal>
        </>
      );
    }

    const user = userEvent.setup();
    render(<FocusExample />);
    const trigger = screen.getByRole('button', { name: 'Edit feature' });

    await user.click(trigger);
    expect(screen.getByRole('textbox', { name: 'Feature name' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Close modal' }));
    expect(trigger).toHaveFocus();
  });
});
