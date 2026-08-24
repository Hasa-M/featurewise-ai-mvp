import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { createLibreOfficeUserInstallationArgument } from './context-file-processor.service';

describe('ContextFileProcessorService', () => {
  it('passes the isolated LibreOffice profile as a valid file URL', () => {
    const profileDirectory = path.join(
      tmpdir(),
      'featurewise context',
      'profile',
    );

    expect(createLibreOfficeUserInstallationArgument(profileDirectory)).toBe(
      `-env:UserInstallation=${pathToFileURL(profileDirectory).href}`,
    );
    expect(
      createLibreOfficeUserInstallationArgument(profileDirectory),
    ).toContain('%20');
  });
});
