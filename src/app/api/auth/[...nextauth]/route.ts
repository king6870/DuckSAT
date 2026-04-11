import NextAuth from "next-auth/next"
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'

// authOptions (from lib/auth.ts) uses strategy: 'jwt', which is required for
// CredentialsProvider. Using strategy: 'database' with CredentialsProvider
// prevents session creation and immediately signs the user out.
const handler = async (req: NextRequest, res: unknown) => {
  try {
    return await NextAuth(authOptions)(req, res)
  } catch (error) {
    console.error('[NextAuth API Error]', error)
    return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export { handler as GET, handler as POST }
