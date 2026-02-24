import { defineConfig } from '@prisma/cli';

export default defineConfig({
  datasource: {
    provider: 'sqlserver',
    url: process.env.DATABASE_URL,
    // shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL, // optional
  },
});
