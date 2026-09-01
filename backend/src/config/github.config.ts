import { registerAs } from '@nestjs/config';

export interface GitHubConfig {
  readonly enabled: boolean;
  readonly appId: string;
  readonly appSlug: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly privateKey: string;
  readonly callbackUrl: string;
  readonly frontendBaseUrl: string;
}

function parseEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required when GITHUB_ENABLED=true`);
  return value;
}

function absoluteUrl(name: string): string {
  const value = required(name);
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute HTTP(S) URL`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${name} must be an absolute HTTP(S) URL`);
  }
  return parsed.toString().replace(/\/$/, '');
}

export function loadGitHubConfig(): GitHubConfig {
  const enabled = parseEnabled(process.env.GITHUB_ENABLED);
  if (!enabled) {
    return {
      enabled: false,
      appId: '',
      appSlug: '',
      clientId: '',
      clientSecret: '',
      privateKey: '',
      callbackUrl: '',
      frontendBaseUrl: '',
    };
  }

  const encodedKey = required('GITHUB_PRIVATE_KEY_BASE64');
  let privateKey: string;
  try {
    privateKey = Buffer.from(encodedKey, 'base64').toString('utf8');
  } catch {
    throw new Error('GITHUB_PRIVATE_KEY_BASE64 is not valid base64');
  }
  if (!privateKey.includes('BEGIN') || !privateKey.includes('PRIVATE KEY')) {
    throw new Error(
      'GITHUB_PRIVATE_KEY_BASE64 must decode to a PEM private key',
    );
  }

  return {
    enabled: true,
    appId: required('GITHUB_APP_ID'),
    appSlug: required('GITHUB_APP_SLUG'),
    clientId: required('GITHUB_CLIENT_ID'),
    clientSecret: required('GITHUB_CLIENT_SECRET'),
    privateKey,
    callbackUrl: absoluteUrl('GITHUB_CALLBACK_URL'),
    frontendBaseUrl: absoluteUrl('GITHUB_FRONTEND_BASE_URL'),
  };
}

export const githubConfig = registerAs('github', loadGitHubConfig);
