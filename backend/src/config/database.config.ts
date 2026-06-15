import { registerAs } from '@nestjs/config';

import { buildDatabaseUrl } from './database-url';

export interface DatabaseConfig {
  readonly url: string;
}

export const databaseConfig = registerAs(
  'database',
  (): DatabaseConfig => ({
    url: buildDatabaseUrl(),
  }),
);
