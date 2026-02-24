import { defineConfig } from '@prisma/client';

export default defineConfig({
  datasource: {
    provider: 'sqlserver',
    url: process.env.DATABASE_URL,
    // shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL, // optional
  },
});
