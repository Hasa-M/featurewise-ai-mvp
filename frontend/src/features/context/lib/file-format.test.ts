import { describe, expect, it } from 'vitest';

import { formatFileSize } from './file-format';

describe('formatFileSize', () => {
  it('formats bytes using compact binary units', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2.0 MB');
  });
});
