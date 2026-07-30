import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TextInput } from '../text-input';
import { FormModal } from './FormModal';

describe('FormModal', () => {
  it('submits its form and exposes server feedback', async () => {
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
    });
    const user = userEvent.setup();
    render(
      <FormModal
        errorMessage='The feature could not be saved.'
        onOpenChange={() => undefined}
        onReset={() => undefined}
        onSubmit={onSubmit}
        open
        submitLabel='Save changes'
        title='Edit feature'
      >
        <TextInput label='Feature title' />
      </FormModal>,
    );

    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The feature could not be saved.',
    );
  });

  it('blocks dismissal while submitting', () => {
    render(
      <FormModal
        onOpenChange={() => undefined}
        onReset={() => undefined}
        onSubmit={() => undefined}
        open
        submitLabel='Create feature'
        submitting
        title='Create feature'
      >
        <TextInput label='Feature title' />
      </FormModal>,
    );

    expect(screen.queryByRole('button', { name: 'Close modal' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Create feature' })).toBeDisabled();
  });

  it('owns the reset action and delegates restoration to the form', async () => {
    const onReset = vi.fn();
    const user = userEvent.setup();
    render(
      <FormModal
        onOpenChange={() => undefined}
        onReset={onReset}
        onSubmit={() => undefined}
        open
        submitLabel='Save changes'
        title='Edit feature'
      >
        <TextInput label='Feature title' />
      </FormModal>,
    );

    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(onReset).toHaveBeenCalledOnce();
  });
});
