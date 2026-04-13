'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Gift, Copy, Check, X } from 'lucide-react'

const POPUP_INTERVAL_MS = 20 * 60 * 1000 // 20 minutes

export function ReferralPopup() {
  const { status } = useSession()
  const [show, setShow] = useState(false)
  const [link, setLink] = useState('')
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)

  const fetchReferral = useCallback(async () => {
    try {
      const res = await fetch('/api/referrals')
      if (!res.ok) return
      const data = await res.json()
      setLink(data.link ?? '')
      setCode(data.code ?? '')
    } catch {
      // silently ignore
    }
  }, [])

  useEffect(() => {
    if (status !== 'authenticated') return

    // Fetch referral data once
    fetchReferral()

    // Show popup after 20 minutes, then every 20 minutes
    const timer = setTimeout(() => {
      setShow(true)
    }, POPUP_INTERVAL_MS)

    const interval = setInterval(() => {
      setShow(true)
    }, POPUP_INTERVAL_MS)

    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [status, fetchReferral])

  async function handleCopy() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      const el = document.createElement('textarea')
      el.value = link
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!show || !link) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative animate-in slide-in-from-bottom-4 duration-300">
        {/* Close */}
        <button
          onClick={() => setShow(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Share & Earn</h3>
            <p className="text-xs text-gray-500">Refer a friend, get a free practice test</p>
          </div>
        </div>

        {/* Code display */}
        {code && (
          <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-2 text-center mb-3">
            <p className="text-xs text-purple-500 mb-0.5">Your referral code</p>
            <p className="font-mono text-xl font-bold tracking-widest text-purple-700">{code}</p>
          </div>
        )}

        {/* Copy link */}
        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-xl font-semibold transition-all mb-3"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Link copied!' : 'Copy referral link'}
        </button>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/referrals"
            onClick={() => setShow(false)}
            className="text-sm text-purple-600 hover:underline font-medium"
          >
            View referrals page
          </Link>
          <button
            onClick={() => setShow(false)}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
