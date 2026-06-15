import { defineConfig } from 'prisma/config';
import { config as loadEnv } from 'dotenv';

import { buildDatabaseUrl } from './src/config/database-url';

loadEnv();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: buildDatabaseUrl(),
  },
});
