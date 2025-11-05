import 'server-only'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import type { NextAuthOptions } from 'next-auth'

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

// Helper to get NextAuth secret
// This function will only be called on the server side due to 'server-only' import
function getSecret() {
  const isProduction = process.env.NODE_ENV === 'production';
  const secret = process.env.NEXTAUTH_SECRET;
  
  // In development, use fallback
  if (!isProduction) {
    return secret || 'development-secret-please-change-in-production';
  }
  
  // In production, secret is required
  if (!secret) {
    const errorMessage = `NEXTAUTH_SECRET environment variable must be set in production.
Generate a secure secret with: openssl rand -base64 32
For Vercel deployments, ensure the variable is set in the Vercel dashboard under Project Settings > Environment Variables.`;
    
    console.error('[NextAuth Config] FATAL:', errorMessage);
    throw new Error(errorMessage);
  }
  
  return secret;
}

// Auth configuration for NextAuth
// This is only used server-side due to 'server-only' import at the top
export const authOptions: NextAuthOptions = {
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
