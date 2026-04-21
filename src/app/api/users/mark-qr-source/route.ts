import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/users/mark-qr-source
// Marks the current user as having joined via QR code (idempotent)
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      joinedViaQrCode: true,
      qrCodeJoinedAt: new Date(),
    },
  })

  return NextResponse.json({ success: true })
}
