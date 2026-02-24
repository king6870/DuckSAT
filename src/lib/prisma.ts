import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

if (typeof window === 'undefined') {
  // Use eval to prevent Webpack from bundling
}

export const prisma = globalForPrisma.prisma || new PrismaClient({});
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
