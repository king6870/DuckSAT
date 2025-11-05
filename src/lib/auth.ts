import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'

// Validate NEXTAUTH_SECRET at module load time (build time in production)
// This ensures fail-fast feedback rather than runtime errors
const isProduction = process.env.NODE_ENV === 'production';
const secret = process.env.NEXTAUTH_SECRET;

// Debug logging to help diagnose environment variable loading issues
// Logs in two scenarios:
// 1. Development mode (always logs to help developers)
// 2. Production mode when secret is missing (to help diagnose deployment issues)
// The actual secret value is never logged for security
if (!isProduction || !secret) {
  console.log('[NextAuth Config] Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_SECRET_present: !!secret,
    NEXTAUTH_SECRET_length: secret?.length || 0,
    NEXTAUTH_URL_present: !!process.env.NEXTAUTH_URL,
  });
}

// Fail-fast in production if NEXTAUTH_SECRET is not set
if (isProduction && !secret) {
  const errorMessage = `NEXTAUTH_SECRET environment variable must be set in production.
Generate a secure secret with: openssl rand -base64 32
For Vercel deployments, ensure the variable is set in the Vercel dashboard under Project Settings > Environment Variables.`;
  
  console.error('[NextAuth Config] FATAL:', errorMessage);
  throw new Error(errorMessage);
}

// Helper to build providers list
function getProviders() {
  const providers = [];
  // Only configure Google provider if credentials are available
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    );
  }
  return providers;
}

// Helper to get NextAuth secret - no fallback in production
function getSecret() {
  // In production, we've already validated at module load time
  if (secret) {
    return secret;
  }
  
  // Only use fallback in development
  if (!isProduction) {
    return 'development-secret-please-change-in-production';
  }
  
  // This should never be reached due to module-load validation above,
  // but included as a safety measure
  throw new Error(`NEXTAUTH_SECRET environment variable must be set in production.
Generate a secure secret with: openssl rand -base64 32`);
}

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: getProviders(),
  session: {
    strategy: 'jwt' as const,
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  secret: getSecret(),
}

export { getProviders, getSecret }
