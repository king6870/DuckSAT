"use client"

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-red-50 border border-red-200 p-4">
        <div className="text-sm text-red-700">
          {error === 'Configuration' && 'There is a problem with the server configuration.'}
          {error === 'AccessDenied' && 'Access was denied. Please try again.'}
          {error === 'Verification' && 'The verification token has expired or has already been used.'}
          {error === 'Callback' && 'There was a problem with the authentication callback. Please ensure the database is properly configured and try again.'}
          {error === 'OAuthSignin' && 'Error constructing an authorization URL.'}
          {error === 'OAuthCallback' && 'Error handling the response from the OAuth provider.'}
          {error === 'OAuthCreateAccount' && 'Could not create OAuth provider user in the database.'}
          {error === 'EmailCreateAccount' && 'Could not create email provider user in the database.'}
          {error === 'SessionRequired' && 'The content of this page requires you to be signed in at all times.'}
          {!error && 'An unknown authentication error occurred.'}
        </div>
      </div>
      {error === 'Callback' && (
        <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm text-blue-800 font-medium mb-2">Troubleshooting steps:</p>
          <ol className="list-decimal list-inside text-xs text-blue-700 space-y-1">
            <li>Ensure your database is running and accessible</li>
            <li>Verify DATABASE_URL in your .env.local file</li>
            <li>Run: npx prisma db push</li>
            <li>Check that Google OAuth redirect URI is configured: http://localhost:3000/api/auth/callback/google</li>
          </ol>
        </div>
      )}
    </div>
  )
}

export default function AuthError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Authentication Error
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            There was a problem signing you in
          </p>
        </div>
        <Suspense fallback={
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">Loading error details...</div>
          </div>
        }>
          <ErrorContent />
        </Suspense>
        <div className="text-center">
          <Link 
            href="/"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Return to home page
          </Link>
        </div>
      </div>
    </div>
  )
}