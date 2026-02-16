/**
 * Health Check & Environment Diagnostics API
 * 
 * Provides diagnostic information to troubleshoot deployment issues.
 * Shows which environment variables are present (without exposing values).
 * Tests critical service connections (database, Azure OpenAI).
 * 
 * @endpoint GET /api/admin/health-check
 * @auth Admin only
 * @returns Diagnostic information about system health
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Check environment variables (presence only, not values)
    const envCheck = {
      NEXTAUTH_SECRET: {
        present: !!process.env.NEXTAUTH_SECRET,
        length: process.env.NEXTAUTH_SECRET?.length || 0
      },
      NEXTAUTH_URL: {
        present: !!process.env.NEXTAUTH_URL,
        value: process.env.NEXTAUTH_URL // Safe to show
      },
      DATABASE_URL: {
        present: !!process.env.DATABASE_URL,
        length: process.env.DATABASE_URL?.length || 0
      },
      AZURE_OPENAI_API_KEY: {
        present: !!process.env.AZURE_OPENAI_API_KEY,
        length: process.env.AZURE_OPENAI_API_KEY?.length || 0
      },
      ENDPOINT_URL: {
        present: !!process.env.ENDPOINT_URL,
        length: process.env.ENDPOINT_URL?.length || 0,
        domain: process.env.ENDPOINT_URL ? new URL(process.env.ENDPOINT_URL).hostname : null
      },
      AZURE_OPENAI_ENDPOINT: {
        present: !!process.env.AZURE_OPENAI_ENDPOINT,
        length: process.env.AZURE_OPENAI_ENDPOINT?.length || 0,
        domain: process.env.AZURE_OPENAI_ENDPOINT ? new URL(process.env.AZURE_OPENAI_ENDPOINT).hostname : null
      },
      AZURE_OPENAI_DEPLOYMENT: {
        present: !!process.env.AZURE_OPENAI_DEPLOYMENT,
        value: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o (default)'
      },
      AZURE_OPENAI_API_VERSION: {
        present: !!process.env.AZURE_OPENAI_API_VERSION,
        value: process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview (default)'
      }
    }

    // Test database connection
    let dbStatus = { connected: false, error: null as string | null, latency: 0 }
    try {
      const startTime = Date.now()
      await prisma.$queryRaw`SELECT 1 as test`
      dbStatus = {
        connected: true,
        error: null,
        latency: Date.now() - startTime
      }
    } catch (dbError) {
      dbStatus = {
        connected: false,
        error: dbError instanceof Error ? dbError.message : 'Unknown database error',
        latency: 0
      }
    }

    // Test Azure OpenAI endpoint accessibility (without making actual call)
    let azureOpenAIStatus = { 
      configured: false, 
      endpointAccessible: false, 
      error: null as string | null 
    }
    
    const endpoint = process.env.ENDPOINT_URL || 
      (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_DEPLOYMENT
        ? `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview'}`
        : null)
    const apiKey = process.env.AZURE_OPENAI_API_KEY

    if (endpoint && apiKey) {
      azureOpenAIStatus.configured = true
      
      // Test endpoint with a minimal HEAD/OPTIONS request (don't actually call the API)
      try {
        const testResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'api-key': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'test' }],
            max_completion_tokens: 1
          })
        })
        
        // Even 4xx means endpoint is accessible (auth/validation errors)
        azureOpenAIStatus.endpointAccessible = testResponse.status < 500
        
        if (!testResponse.ok && testResponse.status >= 500) {
          azureOpenAIStatus.error = `HTTP ${testResponse.status}: ${await testResponse.text()}`
        }
      } catch (fetchError) {
        azureOpenAIStatus.error = fetchError instanceof Error ? fetchError.message : 'Failed to reach endpoint'
      }
    } else {
      azureOpenAIStatus.error = 'Missing AZURE_OPENAI_API_KEY or ENDPOINT_URL/AZURE_OPENAI_ENDPOINT'
    }

    // Overall health assessment
    const isHealthy = dbStatus.connected && azureOpenAIStatus.configured

    return NextResponse.json({
      healthy: isHealthy,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      checks: {
        database: dbStatus,
        azureOpenAI: azureOpenAIStatus
      },
      environmentVariables: envCheck,
      recommendations: [
        ...(!envCheck.AZURE_OPENAI_API_KEY.present ? ['Set AZURE_OPENAI_API_KEY in Vercel Dashboard'] : []),
        ...(!envCheck.ENDPOINT_URL.present && !envCheck.AZURE_OPENAI_ENDPOINT.present 
          ? ['Set ENDPOINT_URL or AZURE_OPENAI_ENDPOINT in Vercel Dashboard'] 
          : []),
        ...(!dbStatus.connected ? ['Check DATABASE_URL connection string'] : []),
        ...(isHealthy ? ['System is healthy! ✅'] : [])
      ]
    })

  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
