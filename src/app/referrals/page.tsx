'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Gift, Copy, Check, Users, Star, Share2, ExternalLink } from 'lucide-react'

interface ReferralData {
  code: string
  link: string
  count: number
  bonusTests: number
}

export default function ReferralsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<'link' | 'code' | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  const fetchReferral = useCallback(async () => {
    try {
      const res = await fetch('/api/referrals')
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') fetchReferral()
  }, [status, fetchReferral])

  async function copyToClipboard(text: string, type: 'link' | 'code') {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  function shareLink() {
    if (!data) return
    if (navigator.share) {
      navigator.share({
        title: 'Join DuckSAT — Free SAT Prep',
        text: 'Use my referral link to sign up for DuckSAT and I get a free practice test!',
        url: data.link,
      }).catch(() => {})
    } else {
      copyToClipboard(data.link, 'link')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4 shadow-lg">
            <Gift className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Refer Friends, Earn Tests</h1>
          <p className="text-gray-600 text-lg">Share DuckSAT with a friend. When they sign up, <strong>you both win</strong>.</p>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">How it works</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-2">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto text-purple-600 font-bold">1</div>
              <p className="text-sm text-gray-600">Share your referral link with a friend</p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600 font-bold">2</div>
              <p className="text-sm text-gray-600">They sign up using your link</p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center mx-auto text-pink-600 font-bold">3</div>
              <p className="text-sm text-gray-600">You get a free extra practice test!</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
            <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gray-900">{data?.count ?? 0}</p>
            <p className="text-sm text-gray-500 mt-1">Friends referred</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
            <Star className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gray-900">{data?.bonusTests ?? 0}</p>
            <p className="text-sm text-gray-500 mt-1">Bonus practice tests earned</p>
          </div>
        </div>

        {/* Referral link card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Your referral link</h2>

          {/* Code */}
          <div>
            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Your code</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-mono text-lg font-bold tracking-widest text-purple-700">
                {data?.code ?? '—'}
              </div>
              <button
                onClick={() => data && copyToClipboard(data.code, 'code')}
                className="flex-shrink-0 flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl font-medium transition-colors"
              >
                {copied === 'code' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                {copied === 'code' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Full link */}
          <div>
            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Share link</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600 truncate">
                {data?.link ?? '—'}
              </div>
              <button
                onClick={() => data && copyToClipboard(data.link, 'link')}
                className="flex-shrink-0 flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-xl font-medium transition-colors"
              >
                {copied === 'link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied === 'link' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Share buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={shareLink}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-xl font-semibold transition-all"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
            {data?.link && (
              <a
                href={data.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-gray-300 text-gray-600 px-4 py-3 rounded-xl font-medium transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Preview
              </a>
            )}
          </div>
        </div>

        {/* Note */}
        <p className="text-center text-xs text-gray-400">
          Bonus tests are added to your account as soon as your friend completes sign-up. No subscription required.
        </p>
      </div>
    </div>
  )
}
