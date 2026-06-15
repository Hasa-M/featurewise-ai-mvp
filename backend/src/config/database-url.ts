const DEFAULT_DATABASE_PORT = 5432;

type DatabaseEnvironment = NodeJS.ProcessEnv;

function getRequiredEnv(env: DatabaseEnvironment, name: string): string {
  const value = env[name];

  if (value === undefined || value.trim() === '') {
    throw new Error(`${name} is required`);
  }

  return value;
}

function parseDatabasePort(value: string | undefined): number {
  if (value === undefined || value.trim() === '') {
    return DEFAULT_DATABASE_PORT;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DATABASE_PORT must be an integer between 1 and 65535');
  }

  return port;
}

function parseDatabaseSsl(value: string | undefined): boolean {
  if (value === undefined || value.trim() === '') {
    return false;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function encodeCredential(value: string): string {
  return encodeURIComponent(value);
}

export function buildDatabaseUrl(
  env: DatabaseEnvironment = process.env,
): string {
  const explicitDatabaseUrl = env.DATABASE_URL;

  if (explicitDatabaseUrl !== undefined && explicitDatabaseUrl.trim() !== '') {
    return explicitDatabaseUrl;
  }

  const user = getRequiredEnv(env, 'DATABASE_USER');
  const password = getRequiredEnv(env, 'DATABASE_PASSWORD');
  const host = getRequiredEnv(env, 'DATABASE_HOST');
  const port = parseDatabasePort(env.DATABASE_PORT);
  const databaseName = getRequiredEnv(env, 'DATABASE_NAME');
  const query = new URLSearchParams();

  if (parseDatabaseSsl(env.DATABASE_SSL)) {
    query.set('sslmode', 'require');
  }

  const queryString = query.toString();

  return [
    'postgresql://',
    encodeCredential(user),
    ':',
    encodeCredential(password),
    '@',
    host,
    ':',
    port.toString(),
    '/',
    encodeCredential(databaseName),
    queryString === '' ? '' : `?${queryString}`,
  ].join('');
}
