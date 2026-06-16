import { registerAs } from '@nestjs/config';

export interface AuthConfig {
  readonly accessTokenTtlSeconds: number;
  readonly tokenSecret: string;
}

const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 12;
const LOCAL_DEVELOPMENT_TOKEN_SECRET =
  'featurewise-local-development-token-secret-change-me';

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback;
}

export const authConfig = registerAs('auth', (): AuthConfig => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const configuredTokenSecret = process.env.AUTH_TOKEN_SECRET?.trim();

  if (
    nodeEnv === 'production' &&
    (configuredTokenSecret === undefined || configuredTokenSecret === '')
  ) {
    throw new Error('AUTH_TOKEN_SECRET is required in production');
  }

  return {
    accessTokenTtlSeconds: parsePositiveInteger(
      process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS,
      DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
    ),
    tokenSecret:
      configuredTokenSecret === undefined || configuredTokenSecret === ''
        ? LOCAL_DEVELOPMENT_TOKEN_SECRET
        : configuredTokenSecret,
  };
});
