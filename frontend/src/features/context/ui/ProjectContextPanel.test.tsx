import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectContextPanel } from './ProjectContextPanel';

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  mutation: {
    error: null as Error | null,
    isError: false,
    isPending: false,
  },
  query: {
    data: {
      content: '',
      createdAt: new Date('2026-08-29T10:00:00.000Z'),
      projectKey: 'PRJ-204',
      publicKey: 'PCTX-31',
      updatedAt: new Date('2026-08-29T10:00:00.000Z'),
    },
    isError: false,
    isPending: false,
    refetch: vi.fn(),
  },
}));

vi.mock('@/shared/ui/rich-text', () => ({
  RichText: ({
    'aria-label': ariaLabel,
    defaultValue,
    disabled,
    onChange,
  }: {
    readonly 'aria-label'?: string;
    readonly defaultValue?: string;
    readonly disabled?: boolean;
    readonly onChange?: (value: string) => void;
  }) => (
    <textarea
      aria-label={ariaLabel}
      defaultValue={defaultValue}
      disabled={disabled}
      onChange={(event) => onChange?.(event.currentTarget.value)}
    />
  ),
}));

vi.mock('../model/context', () => ({
  useProjectContext: () => mocks.query,
  useUpdateProjectContext: () => ({
    ...mocks.mutation,
    mutateAsync: mocks.mutateAsync,
  }),
}));

describe('ProjectContextPanel', () => {
  beforeEach(() => {
    mocks.mutateAsync.mockReset();
    mocks.mutation.error = null;
    mocks.mutation.isError = false;
    mocks.mutation.isPending = false;
    mocks.query.data.content = '';
    mocks.query.isError = false;
    mocks.query.isPending = false;
    mocks.query.refetch.mockReset();
  });

  it('renders the ProjectContext loading state', () => {
    mocks.query.isPending = true;

    render(
      <ProjectContextPanel
        accessToken='access-token'
        projectKey='PRJ-204'
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading project context...',
    );
  });

  it('edits empty ProjectContext content and returns to the saved state', async () => {
    mocks.mutateAsync.mockImplementation(async (content: string) => ({
      ...mocks.query.data,
      content,
    }));
    const user = userEvent.setup();

    render(
      <ProjectContextPanel
        accessToken='access-token'
        projectKey='PRJ-204'
      />,
    );

    const editor = await screen.findByLabelText('Project context');
    const save = screen.getByRole('button', {
      name: 'Save project context',
    });
    expect(editor).toHaveValue('');
    expect(save).toBeDisabled();
    expect(screen.getByText('Project context is saved')).toBeVisible();

    await user.type(editor, 'Shared project rules');

    expect(screen.getByText('Unsaved project context changes')).toBeVisible();
    expect(save).toBeEnabled();
    await user.click(save);

    expect(mocks.mutateAsync).toHaveBeenCalledWith('Shared project rules');
    expect(await screen.findByText('Project context is saved')).toBeVisible();
  });

  it('offers retry when ProjectContext loading fails', async () => {
    mocks.query.isError = true;
    const user = userEvent.setup();

    render(
      <ProjectContextPanel
        accessToken='access-token'
        projectKey='PRJ-204'
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The project context could not be loaded.',
    );
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mocks.query.refetch).toHaveBeenCalledTimes(1);
  });

  it('disables editing while saving and renders mutation feedback', async () => {
    mocks.mutation.error = new Error('Save failed');
    mocks.mutation.isError = true;
    mocks.mutation.isPending = true;

    render(
      <ProjectContextPanel
        accessToken='access-token'
        projectKey='PRJ-204'
      />,
    );

    expect(await screen.findByLabelText('Project context')).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Save failed');
  });
});
