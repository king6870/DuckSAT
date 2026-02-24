import { PrismaClient } from '@prisma/client';
import path from 'path'
import fs from 'fs'

// Helper to find which .env file is being used
function logActiveEnvFile() {
  const envFiles = ['.env.local', '.env.development', '.env', '.env.production'];
  const cwd = process.cwd();
  for (const file of envFiles) {
    const fullPath = path.join(cwd, file);
    if (fs.existsSync(fullPath)) {
      // Only log the first one found (highest priority)
      // Show absolute path for clarity
      console.log(`[Prisma] Using environment file: ${fullPath}`);
      break;
    }
  }
}

logActiveEnvFile();


const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter: require('@prisma/client/adapter-sqlserver') });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
