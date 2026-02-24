import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let adapter: any;
if (typeof window === 'undefined') {
  // Use eval to prevent Webpack from bundling
  adapter = eval("require('@prisma/client/adapter-sqlserver')");
}

export const prisma = globalForPrisma.prisma || new PrismaClient(adapter ? { adapter } : {});
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
