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
  
  // In production, we require NEXTAUTH_SECRET to be set
  console.warn('NEXTAUTH_SECRET is not set in production. Using a random secret.');
  return crypto.randomUUID();
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
