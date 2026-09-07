import { loadGitHubConfig } from './github.config';

const githubEnvironmentKeys = [
  'GITHUB_ENABLED',
  'GITHUB_APP_ID',
  'GITHUB_APP_SLUG',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'GITHUB_PRIVATE_KEY_BASE64',
  'GITHUB_CALLBACK_URL',
  'GITHUB_FRONTEND_BASE_URL',
] as const;

describe('GitHub configuration', () => {
  const original = Object.fromEntries(
    githubEnvironmentKeys.map((key) => [key, process.env[key]]),
  );

  afterEach(() => {
    for (const key of githubEnvironmentKeys) {
      const value = original[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('is disabled without loading any secret', () => {
    for (const key of githubEnvironmentKeys) delete process.env[key];
    expect(loadGitHubConfig()).toEqual({
      enabled: false,
      appId: '',
      appSlug: '',
      clientId: '',
      clientSecret: '',
      privateKey: '',
      callbackUrl: '',
      frontendBaseUrl: '',
    });
  });

  it('fails fast when an enabled value is missing', () => {
    for (const key of githubEnvironmentKeys) delete process.env[key];
    process.env.GITHUB_ENABLED = 'true';
    expect(() => loadGitHubConfig()).toThrow(
      'GITHUB_PRIVATE_KEY_BASE64 is required',
    );
  });

  it('decodes the private key and validates absolute URLs', () => {
    process.env.GITHUB_ENABLED = 'true';
    process.env.GITHUB_APP_ID = '123';
    process.env.GITHUB_APP_SLUG = 'featurewise-local';
    process.env.GITHUB_CLIENT_ID = 'client';
    process.env.GITHUB_CLIENT_SECRET = 'secret';
    process.env.GITHUB_PRIVATE_KEY_BASE64 = Buffer.from(
      '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
    ).toString('base64');
    process.env.GITHUB_CALLBACK_URL =
      'http://localhost:3000/integrations/github/callback';
    process.env.GITHUB_FRONTEND_BASE_URL = 'http://localhost:5173/';

    const config = loadGitHubConfig();
    expect(config.enabled).toBe(true);
    expect(config.privateKey).toContain('BEGIN PRIVATE KEY');
    expect(config.frontendBaseUrl).toBe('http://localhost:5173');
  });
});
