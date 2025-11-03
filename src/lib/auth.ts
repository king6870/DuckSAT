import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'

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

// Helper to get NextAuth secret with proper fallback
function getSecret() {
  if (process.env.NEXTAUTH_SECRET) {
    return process.env.NEXTAUTH_SECRET;
  }
  
  // Only use fallback in development
  if (process.env.NODE_ENV !== 'production') {
    return 'development-secret-please-change-in-production';
  }
  
  // In production, NEXTAUTH_SECRET must be set
  // Using a random secret would invalidate all sessions on restart
  throw new Error(
    'NEXTAUTH_SECRET environment variable must be set in production. ' +
    'Generate a secure secret with: openssl rand -base64 32'
  );
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
