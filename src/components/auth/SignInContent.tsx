'use client'

import { signIn } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, FormEvent } from 'react'

export default function SignInContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCredentialsSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
        callbackUrl,
      })
      if (result?.error) {
        setError('Invalid username or password.')
      } else if (result?.ok) {
        if (typeof window !== 'undefined' && localStorage.getItem('qr_source')) {
          fetch('/api/users/mark-qr-source', { method: 'POST' }).catch(() => {})
          localStorage.removeItem('qr_source')
        }
        router.push(callbackUrl)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-2xl p-8 border-2 border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              DuckSAT
            </h1>
            <p className="text-gray-600">Sign in to continue your SAT prep</p>
          </div>

          <button
            onClick={() => signIn('google', { callbackUrl: `/auth/welcome?next=${encodeURIComponent(callbackUrl)}` })}
            className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 flex items-center justify-center gap-3 group"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-200" />
            <span className="mx-4 text-sm text-gray-400 font-medium">OR</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your_username"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>

            <p className="text-sm text-center text-gray-500">
              Don&apos;t have an account?{' '}
              <a href="/auth/signup" className="text-blue-600 hover:underline font-medium">
                Sign up
              </a>
            </p>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center mb-4">What you&apos;ll get:</p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Full-length practice tests</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Detailed performance analytics</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Track your progress over time</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>AI-generated practice questions</span>
              </li>
            </ul>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}