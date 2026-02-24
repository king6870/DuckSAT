import { defineConfig } from '@prisma/cli';

export default defineConfig({
  datasource: {
    provider: 'sqlserver',
    url: process.env.DATABASE_URL,
    // Uncomment if you need shadow database
    // shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
