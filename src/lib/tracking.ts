'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'

// ─────────────────────────────────────────────
// Session ID — persists across page navigations
// ─────────────────────────────────────────────
function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sid = sessionStorage.getItem('ducksat_sid')
  if (!sid) {
    sid = `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    sessionStorage.setItem('ducksat_sid', sid)
  }
  return sid
}

function getDeviceType(): string {
  if (typeof window === 'undefined') return 'desktop'
  const w = window.innerWidth
  if (w < 768) return 'mobile'
  if (w < 1024) return 'tablet'
  return 'desktop'
}

// ─────────────────────────────────────────────
// Fire-and-forget beacon sender (uses sendBeacon + fetch fallback)
// ─────────────────────────────────────────────
function sendTracking(url: string, data: unknown) {
  const body = JSON.stringify(data)
  // sendBeacon is reliable on page unload
  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
    if (sent) return
  }
  // Fallback
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {})
}

// ─────────────────────────────────────────────
// EVENT QUEUE — batches events and flushes periodically
// ─────────────────────────────────────────────
const eventQueue: Array<{
  eventType: string
  eventName: string
  metadata?: Record<string, unknown>
  pagePath?: string
  sessionId?: string
}> = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

function flushEvents() {
  if (eventQueue.length === 0) return
  const batch = eventQueue.splice(0, 50)
  sendTracking('/api/tracking/events', {
    sessionId: getSessionId(),
    events: batch,
  })
}

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    flushEvents()
  }, 5000) // flush every 5 seconds
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushEvents()
  })
  window.addEventListener('pagehide', flushEvents)
}

// ─────────────────────────────────────────────
// PUBLIC API: trackEvent
// ─────────────────────────────────────────────
export function trackEvent(
  eventType: string,
  eventName: string,
  metadata?: Record<string, unknown>
) {
  eventQueue.push({
    eventType,
    eventName,
    metadata,
    pagePath: typeof window !== 'undefined' ? window.location.pathname : undefined,
    sessionId: getSessionId(),
  })
  scheduleFlush()
}

// ─────────────────────────────────────────────
// PUBLIC API: trackSurvey — call once on survey completion
// ─────────────────────────────────────────────
export function trackSurvey(
  surveyType: string,
  responses: Array<{
    stepNumber: number
    stepName: string
    answer?: unknown
    timeSpentMs: number
    skipped?: boolean
  }>
) {
  sendTracking('/api/tracking/survey', { surveyType, responses })
}

// ─────────────────────────────────────────────
// PUBLIC API: trackDrill — call on drill completion
// ─────────────────────────────────────────────
export function trackDrill(data: {
  category: string
  moduleType?: string
  difficulty?: string
  totalQuestions: number
  correctAnswers: number
  score: number
  totalTimeMs: number
  startedAt: string
  completedAt: string
  abandoned?: boolean
  questionsLeft?: number
  questionResults: Array<{
    questionId: string
    questionIndex: number
    category: string
    difficulty: string
    moduleType: string
    userAnswer: number
    correctAnswer: number
    isCorrect: boolean
    timeSpentMs: number
    changedAnswer?: boolean
    initialAnswer?: number
  }>
}) {
  // Use fetch (not beacon) since we want the response back
  return fetch('/api/tracking/drill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(r => r.json()).catch(() => null)
}

// ─────────────────────────────────────────────
// HOOK: usePageTracking — auto-tracks page views + dwell time
// ─────────────────────────────────────────────
export function usePageTracking() {
  const pathname = usePathname()
  const enteredAt = useRef(Date.now())
  const prevPath = useRef(pathname)

  const sendPageView = useCallback((path: string, entered: number) => {
    const dwellTimeMs = Date.now() - entered
    if (dwellTimeMs < 500) return // Skip very short views
    sendTracking('/api/tracking/pageview', {
      sessionId: getSessionId(),
      pagePath: path,
      enteredAt: new Date(entered).toISOString(),
      dwellTimeMs,
      scrollDepthPct: getScrollDepth(),
      referrer: prevPath.current !== path ? prevPath.current : null,
      deviceType: getDeviceType(),
    })
  }, [])

  useEffect(() => {
    // On route change, send view for previous page
    if (prevPath.current !== pathname) {
      sendPageView(prevPath.current, enteredAt.current)
      prevPath.current = pathname
      enteredAt.current = Date.now()
    }

    // On unmount / tab close, send current page view
    const handleUnload = () => sendPageView(pathname, enteredAt.current)
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        sendPageView(pathname, enteredAt.current)
      }
    }
    window.addEventListener('pagehide', handleUnload)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('pagehide', handleUnload)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [pathname, sendPageView])
}

// ─────────────────────────────────────────────
// HOOK: useSurveyTracking — tracks time per survey step
// ─────────────────────────────────────────────
export function useSurveyTracking(surveyType: string) {
  const stepTimes = useRef<Map<number, { start: number; name: string }>>(new Map())
  const responses = useRef<Array<{
    stepNumber: number
    stepName: string
    answer?: unknown
    timeSpentMs: number
    skipped?: boolean
  }>>([])

  const startStep = useCallback((stepNumber: number, stepName: string) => {
    stepTimes.current.set(stepNumber, { start: Date.now(), name: stepName })
  }, [])

  const recordStep = useCallback((stepNumber: number, answer: unknown, skipped = false) => {
    const entry = stepTimes.current.get(stepNumber)
    if (!entry) return
    responses.current.push({
      stepNumber,
      stepName: entry.name,
      answer,
      timeSpentMs: Date.now() - entry.start,
      skipped,
    })
  }, [])

  const flush = useCallback(() => {
    if (responses.current.length > 0) {
      trackSurvey(surveyType, responses.current)
    }
  }, [surveyType])

  return { startStep, recordStep, flush }
}

// ─────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────
function getScrollDepth(): number {
  if (typeof window === 'undefined') return 0
  const doc = document.documentElement
  const scrollTop = window.scrollY || doc.scrollTop
  const scrollHeight = doc.scrollHeight - doc.clientHeight
  if (scrollHeight === 0) return 100
  return Math.min(100, Math.round((scrollTop / scrollHeight) * 100))
}
