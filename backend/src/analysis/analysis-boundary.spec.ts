import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

function listTypeScriptFiles(directory: string): readonly string[] {
  return readdirSync(directory).flatMap((entry) => {
    const candidate = path.join(directory, entry);

    return statSync(candidate).isDirectory()
      ? listTypeScriptFiles(candidate)
      : candidate.endsWith('.ts') && !candidate.endsWith('.spec.ts')
        ? [candidate]
        : [];
  });
}

describe('analysis boundary imports', () => {
  it('keeps contracts and ports independent from delivery and infrastructure implementations', () => {
    const analysisDirectory = path.resolve(process.cwd(), 'src', 'analysis');
    const boundaryFiles = [
      ...listTypeScriptFiles(path.join(analysisDirectory, 'contracts')),
      ...listTypeScriptFiles(path.join(analysisDirectory, 'ports')),
    ];
    const forbiddenImports = [
      '@aws-sdk',
      '@prisma/client',
      'storage.service',
      'controller',
      'react',
      'frontend',
      'openai',
      'anthropic',
    ];

    for (const file of boundaryFiles) {
      const source = readFileSync(file, 'utf8').toLowerCase();

      for (const forbiddenImport of forbiddenImports) {
        expect(source).not.toContain(forbiddenImport);
      }
    }
  });
});
