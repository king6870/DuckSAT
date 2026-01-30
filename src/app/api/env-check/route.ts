/**
 * Environment Variable Diagnostic API Route
 * 
 * WARNING: This endpoint is designed for debugging environment variable issues.
 * By default, it only returns presence (true/false) and length information.
 * Actual secret values are NEVER exposed.
 * 
 * Security:
 * - In production: Only returns presence/length by default
 * - To enable detailed diagnostics in production: Set ALLOW_ENV_DIAGNOSTICS=true
 *   OR use query param ?diagnostics=true (requires ALLOW_ENV_DIAGNOSTICS=true)
 * - Never exposes actual secret values, only metadata
 * 
 * Usage:
 * - GET /api/env-check - Returns basic presence/length info
 * - GET /api/env-check?diagnostics=true - Requires ALLOW_ENV_DIAGNOSTICS env var
 */
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

const REQUIRED_ENV_VARS = [
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'DATABASE_URL',
  'DATABASE_URL_UNPOOLED',
] as const

export async function GET(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production'
  const allowDiagnostics = process.env.ALLOW_ENV_DIAGNOSTICS === 'true'
  const searchParams = request.nextUrl.searchParams
  const diagnosticsParam = searchParams.get('diagnostics') === 'true'
  
  // In production, require explicit opt-in for any diagnostics
  const enableDiagnostics = !isProduction || (allowDiagnostics && diagnosticsParam)
  
  // Build response with presence, length, and NODE_ENV
  const envCheck: Record<string, { present: boolean; length: number }> = {}
  
  REQUIRED_ENV_VARS.forEach(varName => {
    const value = process.env[varName]
    envCheck[varName] = {
      present: !!value,
      length: value?.length || 0,
    }
  })
  
  const response = {
    NODE_ENV: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    diagnosticsEnabled: enableDiagnostics,
    variables: envCheck,
  }
  
  // Add warning if diagnostics were requested in production but not allowed
  if (isProduction && diagnosticsParam && !allowDiagnostics) {
    return NextResponse.json({
      error: 'Diagnostics not enabled',
      message: 'Set ALLOW_ENV_DIAGNOSTICS=true environment variable to enable diagnostics in production',
      NODE_ENV: process.env.NODE_ENV,
    }, { status: 403 })
  }
  
  return NextResponse.json(response)
}