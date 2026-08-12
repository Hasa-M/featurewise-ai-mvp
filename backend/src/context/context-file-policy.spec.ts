import { UnprocessableEntityException } from '@nestjs/common';

import {
  MAX_FILE_BYTES,
  MAX_SELECTED_BYTES,
  MAX_SELECTED_FILES,
  MAX_TOTAL_FILES,
  resolveContextFilePolicy,
} from './context-file-policy';

describe('Context file policy', () => {
  it('keeps rich documents, spreadsheets, text, and images as distinct families', () => {
    expect(
      resolveContextFilePolicy('Review Deck.PPTX', 'application/octet-stream'),
    ).toMatchObject({ family: 'document', filename: 'Review Deck.PPTX' });
    expect(resolveContextFilePolicy('data.xlsx', '')).toMatchObject({
      family: 'spreadsheet',
    });
    expect(resolveContextFilePolicy('AGENTS.md', 'text/plain')).toMatchObject({
      family: 'text',
    });
    expect(resolveContextFilePolicy('screen.webp', 'image/webp')).toMatchObject(
      {
        assetType: 'image',
        family: 'image',
      },
    );
  });

  it('rejects archives, executable formats, and mismatched MIME types', () => {
    expect(() =>
      resolveContextFilePolicy('source.zip', 'application/zip'),
    ).toThrow(UnprocessableEntityException);
    expect(() =>
      resolveContextFilePolicy('run.exe', 'application/octet-stream'),
    ).toThrow(UnprocessableEntityException);
    expect(() =>
      resolveContextFilePolicy('screen.png', 'application/pdf'),
    ).toThrow(UnprocessableEntityException);
  });

  it('publishes the approved MVP limits', () => {
    expect(MAX_FILE_BYTES).toBe(25 * 1024 * 1024);
    expect(MAX_SELECTED_BYTES).toBe(50 * 1024 * 1024);
    expect(MAX_SELECTED_FILES).toBe(10);
    expect(MAX_TOTAL_FILES).toBe(20);
  });
});
