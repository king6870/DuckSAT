/**
 * NextAuth API Route Handler
 * 
 * This is the main NextAuth.js API route that handles all authentication flows.
 * 
 * SECURITY NOTES:
 * - All NextAuth configuration is centralized in @/lib/auth
 * - NEXTAUTH_SECRET is validated at module load time (fail-fast)
 * - No hardcoded secrets or fallbacks exist in production mode
 * - Session strategy uses JWT for serverless compatibility
 * 
 * VERCEL DEPLOYMENT REQUIREMENTS:
 * - NEXTAUTH_SECRET must be set in Vercel Dashboard UI
 * - NEXTAUTH_URL must be set to your production domain
 * - OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) must be set
 * - Test using /api/env after deployment to verify variables are loaded
 * 
 * For setup instructions, see:
 * - docs/VERCEL_ENV_SETUP.md
 * - README.md
 */
import NextAuth from "next-auth/next"
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import { getProviders, getSecret } from '@/lib/auth'

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: getProviders(),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  secret: getSecret(),
})

export { handler as GET, handler as POST }
