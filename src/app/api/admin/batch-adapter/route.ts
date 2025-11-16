import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ADMIN_EMAILS } from '@/constants/adminEmails'

/**
 * Lightweight adapter endpoint for batch generation scripts
 * Supports both session-based and API key authentication
 * 
 * This endpoint acts as a thin wrapper around the enhanced-generate-questions endpoint,
 * adding support for API key authentication for automated scripts.
 */

// API key validation (simple implementation - in production, use proper key management)
function validateApiKey(apiKey: string): boolean {
  // For security, API keys should be stored in environment variables
  const validApiKeys = process.env.ADMIN_API_KEYS?.split(',').map(k => k.trim()) || []
  
  if (validApiKeys.length === 0) {
    // If no API keys configured, only allow session-based auth
    return false
  }
  
  return validApiKeys.includes(apiKey)
}

async function checkAuthentication(request: NextRequest): Promise<{ authenticated: boolean; error?: string }> {
  // Check for API key in Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const apiKey = authHeader.substring(7)
    if (validateApiKey(apiKey)) {
      return { authenticated: true }
    } else {
      return { authenticated: false, error: 'Invalid API key' }
    }
  }
  
  // Fall back to session-based authentication
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.email && ADMIN_EMAILS.includes(session.user.email)) {
      return { authenticated: true }
    }
  } catch {
    // Session check failed - continue to return unauthenticated
  }
  
  return { authenticated: false, error: 'Authentication required' }
}

export async function GET() {
  // Health check endpoint
  return NextResponse.json({
    status: 'ok',
    endpoint: 'batch-adapter',
    version: '1.0.0',
    authentication: ['session', 'api-key'],
    usage: 'POST with generation settings in body'
  })
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const auth = await checkAuthentication(request)
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized', message: 'Admin access required. Use session auth or set Authorization: Bearer <api-key>' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    let settings
    try {
      settings = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Forward to the enhanced generation endpoint
    // Create a new URL for the internal request
    const baseUrl = request.nextUrl.origin
    const targetUrl = `${baseUrl}/api/admin/enhanced-generate-questions`
    
    console.log('🔄 Adapter forwarding request to enhanced-generate-questions...')
    
    // Make internal request
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings)
    })

    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    // Add adapter metadata to response
    return NextResponse.json({
      ...data,
      adapter: {
        version: '1.0.0',
        authenticated: true,
        authMethod: auth.error ? 'session' : 'api-key'
      }
    })

  } catch (error) {
    console.error('Batch adapter error:', error)
    
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    } : { message: 'Unknown error' }
    
    return NextResponse.json(
      {
        error: 'Adapter request failed',
        details: errorDetails.message,
        stack: errorDetails.stack
      },
      { status: 500 }
    )
  }
}
