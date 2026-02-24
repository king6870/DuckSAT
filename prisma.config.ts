import { defineConfig } from '@prisma/internals';

export default defineConfig({
  generators: [
    {
      provider: 'prisma-client-js',
      binaryTargets: [
        'native',
        'debian-openssl-3.0.x',
        'linux-musl',
        'linux-x64'
      ],
    },
  ],
});
