import { defineConfig } from 'prisma/config';
import { config as loadEnv } from 'dotenv';

import { buildDatabaseUrl } from './src/config/database-url';

if (process.env.NODE_ENV !== 'test') loadEnv();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    url: buildDatabaseUrl(),
  },
});
