import type { ReactNode } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'

import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { authOptions } from '@/lib/auth'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email

  if (!email) {
    redirect('/auth/signin?callbackUrl=/admin')
  }

  if (!ADMIN_EMAILS.includes(email)) {
    redirect('/')
  }

  return children
}