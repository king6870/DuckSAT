// Admin AI Question Generation API (Simple version)
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { unifiedQuestionGenerator } from '@/services/unifiedQuestionGenerator'
import { ADMIN_EMAILS } from '@/constants/adminEmails'

async function checkAdminAuth() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    )
  }
  
  return null
}

export async function POST() {
  const authError = await checkAdminAuth()
  if (authError) return authError

  try {
    console.log('🚀 Admin initiated question generation (simple mode)')
    
    // Generate and store questions using the unified generator
    const result = await unifiedQuestionGenerator.generateQuestions({ storeInDatabase: true })
    
    console.log('✅ Generation completed:', result.summary)
    
    return NextResponse.json({
      success: true,
      generated: result.summary.total,
      accepted: result.summary.accepted,
      rejected: result.summary.rejected,
      // stored equals accepted: the unified generator stores all accepted questions when storeInDatabase=true
      stored: result.summary.accepted,
      mathCount: result.summary.mathCount,
      readingCount: result.summary.readingCount,
      avgQuality: result.summary.avgQuality,
    })
  } catch (error) {
    console.error('❌ Admin generation failed:', error)
    return NextResponse.json(
      { 
        error: 'Question generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
