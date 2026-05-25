import { Suspense } from 'react'

import SignInContent from '@/components/auth/SignInContent'

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  )
}
