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

export function trackDrillStart(data: {
  category: string
  moduleType?: string
  difficulty?: string
  drillLength: number
  startedAt: string
}) {
  return fetch('/api/tracking/drill/start', {
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

// ─────────────────────────────────────────────
// POINTER TRACKING — queue + flush
// ─────────────────────────────────────────────
interface PointerEventData {
  pagePath: string
  xPct: number
  yPct: number
  element?: string
  label?: string
  eventType: 'click' | 'move'
}

const pointerQueue: PointerEventData[] = []
let pointerFlushTimer: ReturnType<typeof setTimeout> | null = null

function flushPointerEvents() {
  if (pointerQueue.length === 0) return
  const batch = pointerQueue.splice(0, 100)
  sendTracking('/api/tracking/clicks', {
    sessionId: getSessionId(),
    events: batch,
  })
}

function schedulePointerFlush() {
  if (pointerFlushTimer) return
  pointerFlushTimer = setTimeout(() => {
    pointerFlushTimer = null
    flushPointerEvents()
  }, 5000)
}

if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPointerEvents()
  })
  window.addEventListener('pagehide', flushPointerEvents)
}

// ─────────────────────────────────────────────
// HOOK: usePointerTracking — global click + mouse-move sampling
// ─────────────────────────────────────────────
export function usePointerTracking() {
  const pathname = usePathname()

  useEffect(() => {
    // ── Click / touch handler ──────────────────
    const handleClick = (e: MouseEvent | TouchEvent) => {
      if (typeof window === 'undefined') return

      let clientX: number
      let clientY: number
      if (e instanceof MouseEvent) {
        clientX = e.clientX
        clientY = e.clientY
      } else {
        const touch = e.changedTouches[0]
        if (!touch) return
        clientX = touch.clientX
        clientY = touch.clientY
      }

      const target = e.target as Element | null
      if (!target) return

      // Only track clicks on interactive elements
      const interactive = target.closest('button, a, [role="button"], select, input[type="submit"], input[type="button"]')
      if (!interactive) return

      const tag = interactive.tagName.toLowerCase()
      const rawLabel =
        interactive.textContent?.trim() ||
        interactive.getAttribute('aria-label') ||
        interactive.getAttribute('title') ||
        ''
      const label = rawLabel.slice(0, 80)

      pointerQueue.push({
        pagePath: window.location.pathname,
        xPct: Math.round((clientX / window.innerWidth) * 100),
        yPct: Math.round((clientY / window.innerHeight) * 100),
        element: tag,
        label,
        eventType: 'click',
      })
      schedulePointerFlush()
    }

    // ── Mouse-move sampler ─────────────────────
    let lastMoveX = -1
    let lastMoveY = -1
    let moveSamplesThisMinute = 0
    const MOVE_SAMPLE_INTERVAL_MS = 5000
    const MAX_MOVE_SAMPLES_PER_MIN = 12

    const handleMouseMove = (e: MouseEvent) => {
      lastMoveX = e.clientX
      lastMoveY = e.clientY
    }

    const moveInterval = setInterval(() => {
      if (lastMoveX < 0 || document.visibilityState === 'hidden') return
      if (moveSamplesThisMinute >= MAX_MOVE_SAMPLES_PER_MIN) return

      const xPct = Math.round((lastMoveX / window.innerWidth) * 100)
      const yPct = Math.round((lastMoveY / window.innerHeight) * 100)

      pointerQueue.push({
        pagePath: window.location.pathname,
        xPct,
        yPct,
        eventType: 'move',
      })
      moveSamplesThisMinute++
      schedulePointerFlush()

      // Reset sample counter every minute
    }, MOVE_SAMPLE_INTERVAL_MS)

    const minuteReset = setInterval(() => {
      moveSamplesThisMinute = 0
    }, 60000)

    document.addEventListener('click', handleClick)
    document.addEventListener('touchstart', handleClick as EventListener)
    document.addEventListener('mousemove', handleMouseMove)

    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('touchstart', handleClick as EventListener)
      document.removeEventListener('mousemove', handleMouseMove)
      clearInterval(moveInterval)
      clearInterval(minuteReset)
    }
  }, [pathname])
}

