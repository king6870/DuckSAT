/** @type {import('next').NextConfig} */

/**
 * ⚠️ SECURITY WARNING: Build-time Error Suppression
 * 
 * This configuration ignores ESLint and TypeScript errors during builds.
 * While this allows for faster iteration during development, it can mask
 * potential security issues and bugs in production.
 * 
 * RECOMMENDED ACTIONS:
 * 1. Fix ESLint errors incrementally and remove ignoreDuringBuilds
 * 2. Fix TypeScript errors incrementally and remove ignoreBuildErrors
 * 3. Enable strict mode in production builds
 * 
 * PRODUCTION DEPLOYMENT CHECKLIST:
 * - [ ] Review all ESLint warnings for security issues
 * - [ ] Fix TypeScript type errors that could cause runtime issues
 * - [ ] Consider enabling strict checks for production builds only
 * 
 * TODO: Consider conditional configuration based on NODE_ENV:
 * - Development: Allow errors for faster iteration
 * - Production: Enforce strict checking to prevent issues
 */
const nextConfig = {
  eslint: {
    // ⚠️ WARNING: Ignoring ESLint during builds can hide potential issues
    // TODO: Remove this once ESLint errors are resolved
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ⚠️ WARNING: Ignoring TypeScript errors can lead to runtime failures
    // TODO: Remove this once TypeScript errors are resolved
    ignoreBuildErrors: true,
  },
  
  // External packages that should not be bundled by webpack
  // This is correct for Prisma which has native bindings
  serverExternalPackages: ['@prisma/client', 'prisma'],
  
  /**
   * SECURITY BEST PRACTICES (not yet configured):
   * 
   * 1. Content Security Policy (CSP):
   *    Consider adding CSP headers to prevent XSS attacks
   * 
   * 2. Security Headers:
   *    headers: async () => [
   *      {
   *        source: '/(.*)',
   *        headers: [
   *          { key: 'X-Frame-Options', value: 'DENY' },
   *          { key: 'X-Content-Type-Options', value: 'nosniff' },
   *          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
   *          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
   *        ]
   *      }
   *    ]
   * 
   * 3. Image Optimization:
   *    Configure allowed image domains to prevent image proxy abuse
   * 
   * 4. Environment Variable Exposure:
   *    - Never prefix sensitive variables with NEXT_PUBLIC_
   *    - Only NEXT_PUBLIC_* variables are exposed to the browser
   *    - Server-side variables (like NEXTAUTH_SECRET) are safe
   */
}

module.exports = nextConfig
