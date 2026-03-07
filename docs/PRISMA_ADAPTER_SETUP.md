# Prisma Adapter & Accelerate Setup

## Problem
Prisma v5+ with engineType "client" requires either an `adapter` or `accelerateUrl` to be provided to the PrismaClient constructor. This is required for Next.js 15+ and Turbopack compatibility.

## Solution
- For local/dev: Use default PrismaClient (no engineType "client").
- For serverless/production: Use an adapter (e.g., `@prisma/adapter-node`) or Accelerate URL.

## Example Code
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let prisma: PrismaClient;

if (process.env.PRISMA_ACCELERATE_URL) {
  prisma = new PrismaClient({ accelerateUrl: process.env.PRISMA_ACCELERATE_URL });
} else if (process.env.PRISMA_ADAPTER === 'node') {
  // @ts-ignore
  const { NodeAdapter } = require('@prisma/adapter-node');
  prisma = new PrismaClient({ adapter: new NodeAdapter() });
} else {
  prisma = new PrismaClient();
}

export const prismaInstance = globalForPrisma.prisma || prisma;
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaInstance;
```

## Environment Variables
- `PRISMA_ACCELERATE_URL`: Set to your Accelerate URL for Accelerate engine.
- `PRISMA_ADAPTER`: Set to `node` for Node.js adapter (serverless).

## References
- https://pris.ly/d/client-constructor
- https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/setup-prisma-client

## Steps
1. Install any required adapter: `npm install @prisma/adapter-node`
2. Set environment variables as needed.
3. Update `src/lib/prisma.ts` as shown above.
4. Test login and database access in dev and prod.
