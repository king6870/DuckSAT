'use client'

import Link from 'next/link'

export default function DebugAuthPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6 text-gray-900">🔧 Google OAuth Setup Instructions</h1>
          
          <div className="space-y-6">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
              <h2 className="font-bold text-blue-900 mb-2">Current Issue</h2>
              <p className="text-blue-800">
                The &quot;Continue with Google&quot; button isn&apos;t working because Google OAuth redirect URIs aren&apos;t properly configured.
              </p>
            </div>

            <div className="bg-green-50 border-l-4 border-green-500 p-4">
              <h2 className="font-bold text-green-900 mb-3">✅ Solution: Add Redirect URIs</h2>
              <ol className="list-decimal list-inside space-y-2 text-green-800">
                <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline font-bold">Google Cloud Console</a></li>
                <li>Select your project</li>
                <li>Click on your OAuth 2.0 Client ID</li>
                <li>Under &quot;Authorized redirect URIs&quot;, add these two URLs:</li>
              </ol>
              
              <div className="mt-4 space-y-2">
                <div className="bg-white border border-green-300 rounded p-3">
                  <p className="text-xs text-gray-600 mb-1">For local development:</p>
                  <code className="text-sm font-mono text-green-700 bg-green-100 px-2 py-1 rounded">
                    http://localhost:3000/api/auth/callback/google
                  </code>
                </div>
                
                <div className="bg-white border border-green-300 rounded p-3">
                  <p className="text-xs text-gray-600 mb-1">For production (Vercel):</p>
                  <code className="text-sm font-mono text-green-700 bg-green-100 px-2 py-1 rounded">
                    https://kiroducksat.vercel.app/api/auth/callback/google
                  </code>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
              <h2 className="font-bold text-yellow-900 mb-2">📋 Current Environment Variables</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-yellow-100 px-2 py-1 rounded">GOOGLE_CLIENT_ID:</span>
                  <span className="text-yellow-800">755830677010-q1rai4dg3jh4v56rgm4bukvviuulcu0e.apps.googleusercontent.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-yellow-100 px-2 py-1 rounded">NEXTAUTH_URL:</span>
                  <span className="text-yellow-800">http://localhost:3000</span>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border-l-4 border-purple-500 p-4">
              <h2 className="font-bold text-purple-900 mb-2">🔍 How NextAuth Works</h2>
              <ol className="list-decimal list-inside space-y-1 text-sm text-purple-800">
                <li>User clicks &quot;Sign in with Google&quot;</li>
                <li>NextAuth redirects to Google&apos;s OAuth page</li>
                <li>User approves access on Google</li>
                <li>Google redirects back to: <code className="bg-purple-100 px-1">http://localhost:3000/api/auth/callback/google</code></li>
                <li>NextAuth processes the callback and creates a session</li>
              </ol>
              <p className="mt-3 text-sm text-purple-800">
                ⚠️ If the redirect URI isn&apos;t authorized in Google Cloud Console, step 4 will fail.
              </p>
            </div>

            <div className="bg-gray-100 border border-gray-300 rounded p-4">
              <h2 className="font-bold text-gray-900 mb-2">📚 Additional Resources</h2>
              <ul className="space-y-1 text-sm">
                <li>
                  <a 
                    href="https://next-auth.js.org/providers/google" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    NextAuth Google Provider Documentation
                  </a>
                </li>
                <li>
                  <a 
                    href="https://support.google.com/cloud/answer/6158849" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Google OAuth 2.0 Setup Guide
                  </a>
                </li>
              </ul>
            </div>

            <div className="flex gap-4 mt-8">
              <Link
                href="/"
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg text-center font-medium transition-colors block"
              >
                ← Back to Home
              </Link>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-center font-medium transition-colors"
              >
                Open Google Cloud Console →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
