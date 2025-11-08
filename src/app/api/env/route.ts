/**
 * Environment Variable Diagnostic API Route
 * 
 * ⚠️ SECURITY WARNING: This endpoint is designed ONLY for debugging environment variable issues.
 * By default, it NEVER exposes actual secret values - only presence (true/false) and length.
 * 
 * Purpose:
 * - Verify environment variables are correctly loaded at runtime on Vercel
 * - Diagnose missing or misconfigured environment variables
 * - Distinguish between build-time and runtime variable loading issues
 * 
 * Security Features:
 * - ✅ Never exposes actual secret values
 * - ✅ Only returns metadata (presence, length, NODE_ENV)
 * - ✅ Includes timestamp for debugging
 * - ✅ Safe to use in production for diagnostics
 * 
 * Usage:
 * - GET /api/env - Returns basic diagnostic information
 * 
 * Response Format:
 * {
 *   "NODE_ENV": "production",
 *   "timestamp": "2025-11-08T20:49:31.041Z",
 *   "variables": {
 *     "NEXTAUTH_SECRET": { "present": true, "length": 44 },
 *     "NODE_ENV": "production",
 *     ...
 *   }
 * }
 * 
 * ⚠️ IMPORTANT NOTES FOR VERCEL DEPLOYMENTS:
 * 
 * 1. Build-time vs Runtime Variables:
 *    - Variables set in .env files are NOT available at runtime on Vercel
 *    - Variables MUST be set in Vercel Dashboard UI (Settings → Environment Variables)
 *    - This endpoint verifies RUNTIME availability, not build-time
 * 
 * 2. After Deployment:
 *    - Always test this endpoint after deploying to Vercel
 *    - Verify all critical variables show "present": true
 *    - Check that lengths match expected values
 * 
 * 3. Common Issues:
 *    - Variable shows "present": false → Not set in Vercel Dashboard
 *    - Variable has length: 0 → Empty value in Vercel Dashboard
 *    - All variables missing → Forgot to set environment in Vercel (Production vs Preview)
 * 
 * For detailed setup instructions, see:
 * - docs/VERCEL_ENV_SETUP.md
 * - README.md
 */
import { NextResponse } from 'next/server'

/**
 * List of critical environment variables to check.
 * These are essential for the application to function correctly.
 */
const CRITICAL_ENV_VARS = [
  'NEXTAUTH_SECRET',      // Required for NextAuth session encryption
  'NEXTAUTH_URL',         // Required for NextAuth redirect URLs
  'GOOGLE_CLIENT_ID',     // Required for Google OAuth
  'GOOGLE_CLIENT_SECRET', // Required for Google OAuth
  'DATABASE_URL',         // Required for database connection (pooled)
  'DATABASE_URL_UNPOOLED', // Required for database migrations
] as const

/**
 * Interface for environment variable diagnostic information
 */
interface EnvVarInfo {
  present: boolean
  length: number
}

/**
 * Interface for the diagnostic response
 */
interface DiagnosticResponse {
  NODE_ENV: string
  timestamp: string
  summary: {
    total: number
    present: number
    missing: number
  }
  variables: Record<string, EnvVarInfo>
  warnings?: string[]
}

/**
 * GET /api/env
 * 
 * Returns diagnostic information about environment variables.
 * Never exposes actual secret values - only presence and length.
 */
export async function GET() {
  const timestamp = new Date().toISOString()
  const nodeEnv = process.env.NODE_ENV || 'unknown'
  
  // Build diagnostic information for each critical variable
  const variables: Record<string, EnvVarInfo> = {}
  let presentCount = 0
  let missingCount = 0
  const warnings: string[] = []
  
  CRITICAL_ENV_VARS.forEach(varName => {
    const value = process.env[varName]
    const isPresent = !!value
    const length = value?.length || 0
    
    variables[varName] = {
      present: isPresent,
      length: length,
    }
    
    if (isPresent) {
      presentCount++
    } else {
      missingCount++
      warnings.push(`${varName} is not set or is empty`)
    }
  })
  
  // Add NODE_ENV to variables for easy reference
  variables['NODE_ENV'] = {
    present: !!nodeEnv,
    length: nodeEnv.length,
  }
  
  // Add production-specific warnings
  if (nodeEnv === 'production') {
    if (missingCount > 0) {
      warnings.push(
        'CRITICAL: Missing environment variables in production! ' +
        'Set them in Vercel Dashboard → Settings → Environment Variables'
      )
    }
    
    // Check for weak NEXTAUTH_SECRET in production
    const secretLength = variables['NEXTAUTH_SECRET']?.length || 0
    if (secretLength > 0 && secretLength < 32) {
      warnings.push(
        'WARNING: NEXTAUTH_SECRET appears short (< 32 chars). ' +
        'Generate a secure secret with: openssl rand -base64 32'
      )
    }
    
    // Check for localhost in NEXTAUTH_URL
    const nextauthUrl = process.env.NEXTAUTH_URL || ''
    if (nextauthUrl.includes('localhost')) {
      warnings.push(
        'WARNING: NEXTAUTH_URL contains "localhost" in production. ' +
        'This should be your production domain (e.g., https://yourdomain.vercel.app)'
      )
    }
  }
  
  const response: DiagnosticResponse = {
    NODE_ENV: nodeEnv,
    timestamp: timestamp,
    summary: {
      total: CRITICAL_ENV_VARS.length,
      present: presentCount,
      missing: missingCount,
    },
    variables: variables,
  }
  
  // Only add warnings array if there are warnings
  if (warnings.length > 0) {
    response.warnings = warnings
  }
  
  return NextResponse.json(response)
}
