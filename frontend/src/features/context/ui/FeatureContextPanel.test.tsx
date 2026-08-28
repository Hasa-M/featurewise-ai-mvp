import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FeatureContextPanel } from './FeatureContextPanel';

vi.mock('@/shared/ui/rich-text', () => ({
  RichText: () => null,
}));

vi.mock('../model/context', () => {
  const mutation = () => ({
    error: null,
    isError: false,
    isPending: false,
    mutateAsync: vi.fn(),
  });

  return {
    openContextFile: vi.fn(),
    useFeatureContext: () => ({
      data: {
        createdAt: new Date('2026-08-24T00:00:00Z'),
        featureKey: 'feature-1',
        featureUpdateKey: null,
        files: [],
        promptContent: '',
        publicKey: 'context-1',
        updatedAt: new Date('2026-08-24T00:00:00Z'),
      },
      isError: false,
      isPending: false,
      refetch: vi.fn(),
    }),
    useFeatureContextArchive: () => ({
      data: {
        files: [
          {
            assetType: 'file',
            canDeletePermanently: true,
            createdAt: new Date('2026-08-24T00:00:00Z'),
            failure: null,
            filename: 'requirements.pdf',
            mimeType: 'application/pdf',
            publicKey: 'file-1',
            readyAt: new Date('2026-08-24T00:00:00Z'),
            selected: false,
            sizeBytes: 1024,
            status: 'ready',
            updatedAt: new Date('2026-08-24T00:00:00Z'),
          },
        ],
        nextCursor: null,
      },
      isError: false,
      isPending: false,
    }),
    usePermanentlyDeleteContextFile: mutation,
    useSelectArchivedContextFiles: mutation,
    useSetContextFileSelection: mutation,
    useUpdateFeatureContext: mutation,
    useUploadFeatureContextFile: mutation,
  };
});

describe('FeatureContextPanel', () => {
  it('selects and deselects an archived file without retaining the change event', async () => {
    const user = userEvent.setup();

    render(
      <FeatureContextPanel
        accessToken='access-token'
        featureKey='feature-1'
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Files archive' }));

    const archivedFile = screen.getByRole('checkbox', {
      name: 'requirements.pdf',
    });
    const addSelectedFiles = screen.getByRole('button', {
      name: 'Add selected files',
    });

    expect(archivedFile).not.toBeChecked();
    expect(addSelectedFiles).toBeDisabled();

    await user.click(archivedFile);

    expect(archivedFile).toBeChecked();
    expect(addSelectedFiles).toBeEnabled();

    await user.click(archivedFile);

    expect(archivedFile).not.toBeChecked();
    expect(addSelectedFiles).toBeDisabled();
  });
});
