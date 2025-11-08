import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'

/**
 * NextAuth Configuration Module
 * 
 * SECURITY BEST PRACTICES IMPLEMENTED:
 * ✅ Fail-fast validation of critical environment variables
 * ✅ No hardcoded secrets or fallbacks in production
 * ✅ Debug logging that never exposes actual secret values
 * ✅ Clear error messages for missing configuration
 * ✅ Environment-specific behavior (dev vs production)
 * 
 * IMPORTANT NOTES FOR VERCEL DEPLOYMENTS:
 * - Environment variables MUST be set in Vercel Dashboard UI
 * - .env files are NOT deployed to Vercel (in .gitignore)
 * - This module loads at build time, catching missing variables early
 * - Runtime errors will still occur if variables aren't in Vercel UI
 * 
 * For setup instructions, see:
 * - docs/VERCEL_ENV_SETUP.md
 * - README.md
 */

// Validate NEXTAUTH_SECRET and NEXTAUTH_URL at module load time (build time in production)
// This ensures fail-fast feedback rather than runtime errors
const isProduction = process.env.NODE_ENV === 'production';
const secret = process.env.NEXTAUTH_SECRET;
const nextAuthUrl = process.env.NEXTAUTH_URL;

// Debug logging to help diagnose environment variable loading issues
// Logs in two scenarios:
// 1. Development mode (always logs to help developers)
// 2. Production mode when secret or URL is missing (to help diagnose deployment issues)
// The actual secret value is never logged for security
if (!isProduction || !secret || !nextAuthUrl) {
  console.log('[NextAuth Config] Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_SECRET_present: !!secret,
    NEXTAUTH_SECRET_length: secret?.length || 0,
    NEXTAUTH_URL_present: !!nextAuthUrl,
    NEXTAUTH_URL_length: nextAuthUrl?.length || 0,
  });
}

// Fail-fast in production if NEXTAUTH_SECRET is not set
if (isProduction && !secret) {
  const errorMessage = `NEXTAUTH_SECRET environment variable must be set in production.
Generate a secure secret with: openssl rand -base64 32
For Vercel deployments, ensure the variable is set in the Vercel dashboard under Project Settings > Environment Variables.
⚠️ IMPORTANT: Variables must be set in the Vercel UI (Dashboard → Settings → Environment Variables), not just in .env files or build scripts.`;
  
  console.error('[NextAuth Config] FATAL:', errorMessage);
  throw new Error(errorMessage);
}

// Fail-fast in production if NEXTAUTH_URL is not set
if (isProduction && !nextAuthUrl) {
  const errorMessage = `NEXTAUTH_URL environment variable must be set in production.
Set this to your application's canonical URL (e.g., https://yourdomain.vercel.app).
For Vercel deployments, ensure the variable is set in the Vercel dashboard under Project Settings > Environment Variables.
⚠️ IMPORTANT: Variables must be set in the Vercel UI (Dashboard → Settings → Environment Variables), not just in .env files or build scripts.`;
  
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
