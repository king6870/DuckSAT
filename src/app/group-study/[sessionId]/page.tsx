"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import MathRenderer from '@/components/MathRenderer'
import ChartRenderer from '@/components/ChartRenderer'

interface SessionResponse {
  session: {
    id: string
    hostId: string
    status: 'lobby' | 'active' | 'completed' | 'canceled'
    questionCount: number
    currentQuestionIndex: number
    timeLimitSec: number | null
    moduleType: string | null
    category: string | null
    difficulty: string | null
    createdAt: string
    startedAt: string | null
    endedAt: string | null
    revealStartedAt: string | null
    revealEndsAt: string | null
    isRevealPhase: boolean
    timeRemainingSec: number | null
    revealRemainingSec: number | null
    canRevealAnswers: boolean
    host: {
      id: string
      username: string | null
      name: string | null
      image: string | null
    }
  }
  me: {
    inviteStatus: 'invited' | 'accepted' | 'declined' | 'left'
    isReady: boolean
    progressStatus: 'waiting' | 'thinking' | 'answered' | 'done'
    isHost: boolean
    correctCount: number
    totalResponseMs: number
  }
  participants: Array<{
    id: string
    username: string | null
    name: string | null
    image: string | null
    inviteStatus: 'invited' | 'accepted' | 'declined' | 'left'
    isReady: boolean
    progressStatus: 'waiting' | 'thinking' | 'answered' | 'done'
    hasAnsweredCurrent: boolean
    answeredCount: number
    questionCount: number
    correctCount: number
    totalResponseMs: number
    avgResponseMs: number | null
    isHost: boolean
  }>
  currentQuestion: {
    id: string
    orderIndex: number
    question: string
    passage: string | null
    options: string[]
    correctAnswer: number | null
    explanation: string | null
    wrongAnswerExplanations: string[]
    moduleType: string
    difficulty: string
    category: string
    subtopic: string | null
    chartData: Record<string, unknown> | null
    imageUrl: string | null
    imageData: string | null
    imageMimeType: string | null
    imageAlt: string | null
    timeEstimate: number
  } | null
  answersByUser: Array<{
    userId: string
    selectedAnswer: number | null
    isCorrect: boolean | null
    responseTimeMs: number | null
  }>
  leaderboard: Array<{
    id: string
    username: string | null
    name: string | null
    image: string | null
    inviteStatus: 'invited' | 'accepted' | 'declined' | 'left'
    isReady: boolean
    progressStatus: 'waiting' | 'thinking' | 'answered' | 'done'
    hasAnsweredCurrent: boolean
    answeredCount: number
    questionCount: number
    correctCount: number
    totalResponseMs: number
    avgResponseMs: number | null
    isHost: boolean
  }>
}

function displayName(user: { username: string | null; name: string | null }) {
  return user.username || user.name || 'User'
}

function statusBadge(status: string) {
  if (status === 'answered') return 'bg-emerald-100 text-emerald-700'
  if (status === 'thinking') return 'bg-amber-100 text-amber-700'
  if (status === 'done') return 'bg-indigo-100 text-indigo-700'
  return 'bg-gray-100 text-gray-700'
}

export default function GroupStudySessionPage() {
  const { status } = useSession()
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const [data, setData] = useState<SessionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=/group-study/${sessionId}`)
    }
  }, [status, router, sessionId])

  const fetchSession = useCallback(async () => {
    if (!sessionId) return

    try {
      const response = await fetch(`/api/group-study/sessions/${sessionId}`)
      if (!response.ok) {
        throw new Error('fetch_failed')
      }
      const json = await response.json()
      setData(json)
      setError(null)
    } catch {
      setError('Could not load session state')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  useEffect(() => {
    if (!data) return

    const pollMs = data.session.status === 'active' ? 2000 : 3500
    const intervalId = window.setInterval(fetchSession, pollMs)
    return () => window.clearInterval(intervalId)
  }, [data, fetchSession])

  useEffect(() => {
    // Reset selected option when question advances.
    setSelectedAnswer(null)
  }, [data?.session.currentQuestionIndex])

  const meAlreadyAnsweredCurrent = useMemo(() => {
    if (!data) return false
    return data.me.progressStatus === 'answered' || data.me.progressStatus === 'done'
  }, [data])

  async function postAction(path: string, body?: Record<string, unknown>) {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      throw new Error('action_failed')
    }

    await fetchSession()
  }

  async function handleJoin() {
    try {
      await postAction(`/api/group-study/sessions/${sessionId}/join`)
    } catch {
      setError('Could not join this session')
    }
  }

  async function handleReadyToggle() {
    if (!data) return
    try {
      await postAction(`/api/group-study/sessions/${sessionId}/ready`, {
        isReady: !data.me.isReady,
      })
    } catch {
      setError('Could not update ready status')
    }
  }

  async function handleStart() {
    try {
      await postAction(`/api/group-study/sessions/${sessionId}/start`)
    } catch {
      setError('Could not start session')
    }
  }

  async function handleSubmitAnswer() {
    if (selectedAnswer == null) {
      setError('Choose an answer first')
      return
    }

    try {
      setSubmitting(true)
      await postAction(`/api/group-study/sessions/${sessionId}/answer`, {
        selectedAnswer,
      })
      setError(null)
    } catch {
      setError('Could not submit answer')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLeave() {
    try {
      await postAction(`/api/group-study/sessions/${sessionId}/leave`)
      router.push('/friends')
    } catch {
      setError('Could not leave session')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-teal-50 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-teal-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-red-100 max-w-lg w-full text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Session Unavailable</h1>
          <p className="text-sm text-gray-600 mb-4">{error || 'Could not load this group study session.'}</p>
          <Link href="/friends" className="inline-flex px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700">
            Back to Friends
          </Link>
        </div>
      </div>
    )
  }

  const { session, participants, currentQuestion, answersByUser } = data
  const acceptedParticipants = participants.filter((participant) => participant.inviteStatus === 'accepted')
  const everyoneReady = acceptedParticipants.every((participant) => participant.isReady)
  const canSubmitAnswer =
    session.status === 'active' &&
    !session.isRevealPhase &&
    data.me.inviteStatus === 'accepted' &&
    !meAlreadyAnsweredCurrent

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-teal-50">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <section className="bg-white rounded-3xl border border-indigo-100 shadow-xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Group Study Session</h1>
              <p className="text-sm text-gray-600 mt-1">
                Host: {displayName(session.host)}
                {' • '}
                Status: <span className="font-semibold capitalize">{session.status}</span>
                {' • '}
                Question {Math.min(session.currentQuestionIndex + 1, session.questionCount)} of {session.questionCount}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {session.status === 'active' && session.timeRemainingSec !== null && !session.isRevealPhase && (
                <span className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold">
                  Time Left: {session.timeRemainingSec}s
                </span>
              )}
              {session.isRevealPhase && session.revealRemainingSec !== null && (
                <span className="px-3 py-1.5 rounded-full bg-violet-100 text-violet-700 text-sm font-semibold">
                  Reveal: {session.revealRemainingSec}s
                </span>
              )}
              <button
                onClick={handleLeave}
                className="px-3 py-1.5 rounded-lg bg-rose-100 text-rose-700 font-semibold text-sm hover:bg-rose-200"
              >
                Leave
              </button>
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </section>

        {data.me.inviteStatus === 'invited' && (
          <section className="bg-white rounded-3xl border border-indigo-100 shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900">Invitation Pending</h2>
            <p className="text-sm text-gray-600 mt-1">Accept this invitation to join the live group study session.</p>
            <button
              onClick={handleJoin}
              className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
            >
              Accept Invite
            </button>
          </section>
        )}

        {session.status === 'lobby' && data.me.inviteStatus === 'accepted' && (
          <section className="bg-white rounded-3xl border border-indigo-100 shadow-lg p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Lobby</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleReadyToggle}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                    data.me.isReady
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {data.me.isReady ? 'Ready' : 'Mark Ready'}
                </button>
                {data.me.isHost && (
                  <button
                    onClick={handleStart}
                    disabled={acceptedParticipants.length < 2}
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Start Session
                  </button>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              {everyoneReady ? 'Everyone is ready.' : 'Waiting for participants to mark ready.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {participants.map((participant) => (
                <div key={participant.id} className="rounded-xl border border-gray-200 p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      {displayName(participant)} {participant.isHost ? '(Host)' : ''}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">{participant.inviteStatus}</div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${participant.isReady ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                    {participant.isReady ? 'Ready' : 'Waiting'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {session.status === 'active' && data.me.inviteStatus === 'accepted' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <section className="xl:col-span-2 bg-white rounded-3xl border border-indigo-100 shadow-lg p-6">
              {!currentQuestion ? (
                <p className="text-sm text-gray-500">Preparing question...</p>
              ) : (
                <>
                  <div className="mb-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">
                      {currentQuestion.moduleType} • {currentQuestion.difficulty} • {currentQuestion.category}
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mt-2">
                      <MathRenderer>{currentQuestion.question}</MathRenderer>
                    </h2>
                  </div>

                  {currentQuestion.passage && (
                    <div className="mb-4 rounded-xl border-l-4 border-blue-500 bg-blue-50 p-4">
                      <p className="text-sm font-semibold text-blue-800 mb-1">Passage</p>
                      <MathRenderer>{currentQuestion.passage}</MathRenderer>
                    </div>
                  )}

                  {(currentQuestion.chartData || currentQuestion.imageData || currentQuestion.imageUrl) && (
                    <div className="mb-5">
                      <ChartRenderer
                        chartData={currentQuestion.chartData || {}}
                        imageUrl={currentQuestion.imageUrl || undefined}
                        imageData={currentQuestion.imageData || undefined}
                        imageMimeType={currentQuestion.imageMimeType || undefined}
                        imageAlt={currentQuestion.imageAlt || undefined}
                      />
                    </div>
                  )}

                  <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => {
                      const isSelected = selectedAnswer === index
                      const revealCorrect = session.canRevealAnswers && currentQuestion.correctAnswer === index

                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedAnswer(index)}
                          disabled={!canSubmitAnswer}
                          className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-colors ${
                            revealCorrect
                              ? 'border-emerald-500 bg-emerald-50'
                              : isSelected
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-gray-200 bg-white hover:border-indigo-300'
                          } ${!canSubmitAnswer ? 'cursor-not-allowed opacity-90' : ''}`}
                        >
                          <span className="font-semibold mr-2">{String.fromCharCode(65 + index)}.</span>
                          <MathRenderer>{option}</MathRenderer>
                        </button>
                      )
                    })}
                  </div>

                  {canSubmitAnswer && (
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={selectedAnswer == null || submitting}
                      className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {submitting ? 'Submitting...' : 'Submit Answer'}
                    </button>
                  )}

                  {session.canRevealAnswers && currentQuestion.explanation && (
                    <div className="mt-6 rounded-xl border-l-4 border-indigo-500 bg-indigo-50 p-4">
                      <p className="text-sm font-semibold text-indigo-800 mb-1">Explanation</p>
                      <MathRenderer>{currentQuestion.explanation}</MathRenderer>
                    </div>
                  )}
                </>
              )}
            </section>

            <section className="bg-white rounded-3xl border border-indigo-100 shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Live Progress</h3>
              <div className="space-y-3">
                {participants.map((participant) => (
                  <div key={participant.id} className="rounded-xl border border-gray-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm text-gray-900">
                        {displayName(participant)} {participant.isHost ? '(Host)' : ''}
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${statusBadge(participant.progressStatus)}`}>
                        {participant.progressStatus}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {participant.answeredCount}/{participant.questionCount} answered
                    </div>
                    {session.canRevealAnswers && (
                      <div className="mt-1 text-xs text-gray-600 font-medium">
                        Score: {participant.correctCount}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {session.canRevealAnswers && (
                <div className="mt-5">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">Current Question Answers</h4>
                  <div className="space-y-2">
                    {participants.map((participant) => {
                      const answer = answersByUser.find((item) => item.userId === participant.id)
                      return (
                        <div key={participant.id} className="rounded-lg border border-gray-200 px-3 py-2 text-xs">
                          <div className="font-medium text-gray-900">{displayName(participant)}</div>
                          {!answer ? (
                            <div className="text-gray-500">No answer submitted</div>
                          ) : (
                            <div className={answer.isCorrect ? 'text-emerald-700' : 'text-rose-700'}>
                              {answer.selectedAnswer !== null
                                ? `${String.fromCharCode(65 + answer.selectedAnswer)} ${answer.isCorrect ? 'Correct' : 'Wrong'}`
                                : 'No answer'}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {(session.status === 'completed' || session.status === 'canceled') && (
          <section className="bg-white rounded-3xl border border-indigo-100 shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {session.status === 'completed' ? 'Session Results' : 'Session Ended'}
            </h2>

            {data.leaderboard.length > 0 && (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600 border-b">
                      <th className="py-2 pr-3">Rank</th>
                      <th className="py-2 pr-3">Participant</th>
                      <th className="py-2 pr-3">Correct</th>
                      <th className="py-2 pr-3">Avg Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.leaderboard.map((participant, index) => (
                      <tr key={participant.id} className="border-b">
                        <td className="py-2 pr-3 font-semibold">#{index + 1}</td>
                        <td className="py-2 pr-3">{displayName(participant)}</td>
                        <td className="py-2 pr-3">{participant.correctCount} / {session.questionCount}</td>
                        <td className="py-2 pr-3">
                          {participant.avgResponseMs != null ? `${Math.round(participant.avgResponseMs / 100) / 10}s` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/friends" className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700">
                Back to Friends
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
