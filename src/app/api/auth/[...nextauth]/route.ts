import NextAuth from "next-auth/next"
import type { NextRequest } from 'next/server'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import { getProviders, getSecret } from '@/lib/auth'
import type { Adapter } from '@auth/core/adapters'

// Wrap PrismaAdapter to ensure all returned data is serializable
function createSerializableAdapter(): Adapter {
  const baseAdapter = PrismaAdapter(prisma) as Adapter
  
  // Helper to deeply serialize objects, removing Set/Map instances but preserving Dates
  const serialize = <T,>(obj: T): T => {
    if (obj === null || obj === undefined) return obj
    if (typeof obj !== 'object') return obj
    
    // Preserve Date objects
    if (obj instanceof Date) return obj
    
    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => serialize(item)) as T
    }
    
    // Handle plain objects - remove Set/Map but preserve Date fields
    const serialized: Record<string, unknown> = {}
    for (const key in obj) {
      const value = (obj as Record<string, unknown>)[key]
      
      // Skip Set/Map instances
      if (value instanceof Set || value instanceof Map) continue
      
      // Preserve Date objects
      if (value instanceof Date) {
        serialized[key] = value
      }
      // Convert date strings back to Date objects for expires fields
      else if ((key === 'expires' || key.endsWith('At')) && typeof value === 'string') {
        const date = new Date(value)
        serialized[key] = isNaN(date.getTime()) ? value : date
      }
      // Recursively serialize nested objects
      else if (value && typeof value === 'object') {
        serialized[key] = serialize(value)
      }
      // Copy primitives
      else {
        serialized[key] = value
      }
    }
    
    return serialized as T
  }

  // Wrap all adapter methods to serialize their return values
  const wrappedAdapter: Record<string, unknown> = {}
  
  for (const key in baseAdapter) {
    const method = (baseAdapter as Record<string, unknown>)[key]
    if (typeof method === 'function') {
      wrappedAdapter[key] = async (...args: unknown[]) => {
        const result = await method(...args)
        return serialize(result)
      }
    } else {
      wrappedAdapter[key] = method
    }
  }

  return wrappedAdapter as Adapter
}

// Create config object separately to avoid serialization issues
const authConfig = {
  adapter: createSerializableAdapter(),
  providers: getProviders(),
  session: {
    strategy: 'database' as const,
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  callbacks: {
    async session({ session, user }: { session: { user?: { id?: string; name?: string | null; email?: string | null; image?: string | null } }; user?: { id: string; name?: string | null; email?: string | null; image?: string | null } }) {
      if (session?.user && user) {
        // Return plain object with only serializable properties
        return {
          ...session,
          user: {
            id: user.id,
            name: user.name || null,
            email: user.email || null,
            image: user.image || null
          }
        }
      }
      return session
    },
  },
  secret: getSecret(),
  debug: process.env.NODE_ENV === 'development',
}

import { NextResponse } from 'next/server'

const handler = async (req: NextRequest, res: unknown) => {
  try {
    return await NextAuth(authConfig)(req, res)
  } catch (error) {
    console.error('[NextAuth API Error]', error)
    return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export { handler as GET, handler as POST }
