import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'

// Check if we're running in a server environment (not in the browser)
// This prevents validation code from running in client-side bundles
const isServer = typeof window === 'undefined';

// Only validate environment variables on the server side
// This prevents errors in client-side bundles where env vars are not available
if (isServer) {
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
}

// Helper to build providers list
function getProviders() {
  // If running in the browser, return empty array (should never be used)
  // This prevents errors if the module is accidentally bundled into client code
  if (!isServer) {
    console.warn('[NextAuth Config] getProviders() called in browser context. This should not happen in normal operation.');
    return [];
  }
  
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
  // If running in the browser, return a placeholder (should never be used)
  // This prevents errors if the module is accidentally bundled into client code
  if (!isServer) {
    console.warn('[NextAuth Config] getSecret() called in browser context. This should not happen in normal operation.');
    return 'client-side-placeholder-not-for-use';
  }
  
  const secret = process.env.NEXTAUTH_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';
  
  // In production, secret must be set (validated server-side at module load)
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
    strategy: 'database' as const,
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async session({ session, user }: any) {
      if (session?.user) {
        session.user.id = user.id
      }
      return session
    },
  },
  secret: getSecret(),
  debug: process.env.NODE_ENV === 'development',
}

export { getProviders, getSecret }
