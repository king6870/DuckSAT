// Admin authentication middleware
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ADMIN_EMAILS } from '@/constants/adminEmails'

export async function isAdmin(request: NextRequest): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return false
    }
    
    return ADMIN_EMAILS.includes(session.user.email)
  } catch (error) {
    console.error('Admin auth check failed:', error)
    return false
  }
}

export async function requireAdmin(request: NextRequest) {
  const isAdminUser = await isAdmin(request)
  
  if (!isAdminUser) {
    throw new Error('Admin access required')
  }
  
  return true
}

export { ADMIN_EMAILS }
