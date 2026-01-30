import NextAuth from "next-auth/next"
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
      return obj.map(item => serialize(item)) as any
    }
    
    // Handle plain objects - remove Set/Map but preserve Date fields
    const serialized: any = {}
    for (const key in obj) {
      const value = (obj as any)[key]
      
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
  const wrappedAdapter: any = {}
  
  for (const key in baseAdapter) {
    const method = (baseAdapter as any)[key]
    if (typeof method === 'function') {
      wrappedAdapter[key] = async (...args: any[]) => {
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
    async session({ session, user }: any) {
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

const handler = NextAuth(authConfig)

export { handler as GET, handler as POST }
