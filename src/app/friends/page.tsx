"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface FriendUser {
  id: string
  username: string | null
  name: string | null
  image: string | null
  email: string | null
}

interface FriendRequestIncoming {
  id: string
  createdAt: string
  fromUser: FriendUser
}

interface FriendRequestOutgoing {
  id: string
  createdAt: string
  toUser: FriendUser
}

interface FriendItem extends FriendUser {
  friendshipCreatedAt: string
}

interface SearchResult extends FriendUser {
  relationship: 'friend' | 'outgoing_pending' | 'incoming_pending' | 'none'
}

interface GroupStudyListItem {
  id: string
  status: 'lobby' | 'active' | 'completed' | 'canceled'
  inviteStatus: 'invited' | 'accepted' | 'declined' | 'left'
  questionCount: number
  currentQuestionIndex: number
  category: string | null
  moduleType: string | null
  difficulty: string | null
  timeLimitSec: number | null
  createdAt: string
  startedAt: string | null
  endedAt: string | null
  hostId: string
  isHost: boolean
  host: {
    id: string
    username: string | null
    name: string | null
    image: string | null
  }
}

function displayName(user: FriendUser) {
  return user.username || user.name || user.email || 'Unknown user'
}

export default function FriendsPage() {
  const { status } = useSession()
  const router = useRouter()

  const [friends, setFriends] = useState<FriendItem[]>([])
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestIncoming[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestOutgoing[]>([])
  const [studySessions, setStudySessions] = useState<GroupStudyListItem[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([])
  const [questionCount, setQuestionCount] = useState(10)
  const [timeLimitSec, setTimeLimitSec] = useState(60)
  const [moduleType, setModuleType] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [category, setCategory] = useState('')
  const [creatingSession, setCreatingSession] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [schemaPending, setSchemaPending] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/friends')
    }
  }, [status, router])

  const fetchAllData = useCallback(async () => {
    if (status !== 'authenticated') return

    try {
      setLoading(true)
      setError(null)

      const [friendsRes, requestsRes, sessionsRes] = await Promise.all([
        fetch('/api/friends'),
        fetch('/api/friends/requests'),
        fetch('/api/group-study/sessions'),
      ])

      const [friendsJson, requestsJson, sessionsJson] = await Promise.all([
        friendsRes.json().catch(() => ({})),
        requestsRes.json().catch(() => ({})),
        sessionsRes.json().catch(() => ({})),
      ])

      const pending = !!(friendsJson.schemaPending || requestsJson.schemaPending || sessionsJson.schemaPending)
      setSchemaPending(pending)

      if (!friendsRes.ok || !requestsRes.ok || !sessionsRes.ok) {
        throw new Error('Failed to load friends data')
      }

      setFriends(friendsJson.friends || [])
      setIncomingRequests(requestsJson.incoming || [])
      setOutgoingRequests(requestsJson.outgoing || [])
      setStudySessions(sessionsJson.sessions || [])
    } catch {
      setError('Failed to load friends data')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  useEffect(() => {
    if (status !== 'authenticated') return

    const intervalId = window.setInterval(() => {
      fetch('/api/group-study/sessions')
        .then((response) => (response.ok ? response.json() : Promise.reject()))
        .then((json) => {
          if (json.schemaPending) {
            setSchemaPending(true)
            return
          }
          setStudySessions(json.sessions || [])
        })
        .catch(() => {})
    }, 4000)

    return () => window.clearInterval(intervalId)
  }, [status])

  useEffect(() => {
    if (status !== 'authenticated') return

    const trimmed = searchQuery.trim()
    if (trimmed.length < 2) {
      setSearchResults([])
      return
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setSearching(true)
        const response = await fetch(`/api/users/search?query=${encodeURIComponent(trimmed)}`)
        if (!response.ok) {
          throw new Error('search_failed')
        }
        const json = await response.json()
        setSearchResults(json.users || [])
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [searchQuery, status])

  const selectedFriendsSet = useMemo(() => new Set(selectedFriendIds), [selectedFriendIds])

  async function sendFriendRequest(toUserId: string) {
    setError(null)
    try {
      const response = await fetch('/api/friends/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId }),
      })

      if (!response.ok) {
        const json = await response.json().catch(() => ({}))
        throw new Error(typeof json.error === 'string' ? json.error : 'request_failed')
      }

      await fetchAllData()
      if (searchQuery.trim().length >= 2) {
        const refreshSearch = await fetch(`/api/users/search?query=${encodeURIComponent(searchQuery.trim())}`)
        if (refreshSearch.ok) {
          const json = await refreshSearch.json()
          setSearchResults(json.users || [])
        }
      }
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'request_failed'
      if (message === 'friends_schema_pending') {
        setSchemaPending(true)
        setError('Friends feature is still provisioning. Run the group-study migration setup endpoint.')
      } else {
        setError('Could not send friend request')
      }
    }
  }

  async function respondToRequest(id: string, action: 'accept' | 'decline') {
    setError(null)
    try {
      const response = await fetch(`/api/friends/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!response.ok) {
        const json = await response.json().catch(() => ({}))
        throw new Error(typeof json.error === 'string' ? json.error : 'response_failed')
      }
      await fetchAllData()
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'response_failed'
      if (message === 'friends_schema_pending') {
        setSchemaPending(true)
        setError('Friends feature is still provisioning. Run the group-study migration setup endpoint.')
      } else {
        setError(`Could not ${action} request`)
      }
    }
  }

  async function cancelOutgoingRequest(id: string) {
    setError(null)
    try {
      const response = await fetch(`/api/friends/requests/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const json = await response.json().catch(() => ({}))
        throw new Error(typeof json.error === 'string' ? json.error : 'cancel_failed')
      }
      await fetchAllData()
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'cancel_failed'
      if (message === 'friends_schema_pending') {
        setSchemaPending(true)
        setError('Friends feature is still provisioning. Run the group-study migration setup endpoint.')
      } else {
        setError('Could not cancel request')
      }
    }
  }

  async function removeFriend(friendId: string) {
    setError(null)
    try {
      const response = await fetch(`/api/friends/${friendId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const json = await response.json().catch(() => ({}))
        throw new Error(typeof json.error === 'string' ? json.error : 'remove_failed')
      }
      setSelectedFriendIds((prev) => prev.filter((id) => id !== friendId))
      await fetchAllData()
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'remove_failed'
      if (message === 'friends_schema_pending') {
        setSchemaPending(true)
        setError('Friends feature is still provisioning. Run the group-study migration setup endpoint.')
      } else {
        setError('Could not remove friend')
      }
    }
  }

  async function createSession() {
    if (selectedFriendIds.length === 0) {
      setError('Select at least one friend for the group session')
      return
    }

    setError(null)
    setCreatingSession(true)

    try {
      const response = await fetch('/api/group-study/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitedUserIds: selectedFriendIds,
          questionCount,
          timeLimitSec,
          moduleType: moduleType || null,
          difficulty: difficulty || null,
          category: category.trim() || null,
        }),
      })

      if (!response.ok) {
        const json = await response.json().catch(() => ({}))
        const message = typeof json.error === 'string' ? json.error : 'create_failed'
        throw new Error(message)
      }

      const json = await response.json()
      const sessionId = json.sessionId as string | undefined

      if (!sessionId) {
        throw new Error('missing_session_id')
      }

      setSelectedFriendIds([])
      setCategory('')
      router.push(`/group-study/${sessionId}`)
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : 'create_failed'
      if (message === 'not_enough_questions_for_filters') {
        setError('Not enough questions for those filters. Loosen filters and try again.')
      } else if (message === 'can_only_invite_friends') {
        setError('You can only invite users who are already your friends.')
      } else if (message === 'group-study_schema_pending') {
        setSchemaPending(true)
        setError('Group study schema is still provisioning. Run the group-study migration setup endpoint.')
      } else {
        setError('Could not create group study session')
      }
    } finally {
      setCreatingSession(false)
    }
  }

  async function joinAndOpenSession(sessionId: string) {
    setError(null)

    try {
      const joinResponse = await fetch(`/api/group-study/sessions/${sessionId}/join`, {
        method: 'POST',
      })
      if (!joinResponse.ok) {
        throw new Error('join_failed')
      }
      router.push(`/group-study/${sessionId}`)
    } catch {
      setError('Could not join the session')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-indigo-50 to-cyan-50 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-indigo-50 to-cyan-50">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white/90 backdrop-blur rounded-3xl border border-indigo-100 shadow-xl p-6">
          <h1 className="text-3xl font-bold text-gray-900">Friends</h1>
          <p className="text-gray-600 mt-1">
            Add friends, start group sessions, and solve the same SAT questions live.
          </p>
          {schemaPending && (
            <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Friends/group-study database migration is not applied yet in this environment.
            </p>
          )}
          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <section className="xl:col-span-2 bg-white rounded-3xl border border-indigo-100 shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Find People</h2>
              <span className="text-xs text-gray-500">Search by username</span>
            </div>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search username (at least 2 characters)"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="mt-4 space-y-3 max-h-[360px] overflow-auto pr-1">
              {searching && <p className="text-sm text-gray-500">Searching...</p>}
              {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                <p className="text-sm text-gray-500">No users found.</p>
              )}
              {searchResults.map((user) => (
                <div key={user.id} className="rounded-xl border border-gray-200 p-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-gray-900">{displayName(user)}</div>
                    <div className="text-xs text-gray-500">{user.email || 'No email'}</div>
                  </div>
                  {user.relationship === 'friend' ? (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">Friend</span>
                  ) : user.relationship === 'outgoing_pending' ? (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700">Pending</span>
                  ) : user.relationship === 'incoming_pending' ? (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">Requested you</span>
                  ) : (
                    <button
                      onClick={() => sendFriendRequest(user.id)}
                      className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      Send Request
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-indigo-100 shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Pending Requests</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Incoming</h3>
                <div className="space-y-2 max-h-52 overflow-auto pr-1">
                  {incomingRequests.length === 0 && (
                    <p className="text-sm text-gray-500">No incoming requests.</p>
                  )}
                  {incomingRequests.map((request) => (
                    <div key={request.id} className="rounded-lg border border-gray-200 p-3">
                      <div className="font-medium text-sm">{displayName(request.fromUser)}</div>
                      <div className="text-xs text-gray-500 mb-2">{request.fromUser.email || 'No email'}</div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => respondToRequest(request.id, 'accept')}
                          className="text-xs font-semibold px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => respondToRequest(request.id, 'decline')}
                          className="text-xs font-semibold px-2 py-1 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Outgoing</h3>
                <div className="space-y-2 max-h-52 overflow-auto pr-1">
                  {outgoingRequests.length === 0 && (
                    <p className="text-sm text-gray-500">No outgoing requests.</p>
                  )}
                  {outgoingRequests.map((request) => (
                    <div key={request.id} className="rounded-lg border border-gray-200 p-3 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-medium text-sm">{displayName(request.toUser)}</div>
                        <div className="text-xs text-gray-500">Pending</div>
                      </div>
                      <button
                        onClick={() => cancelOutgoingRequest(request.id)}
                        className="text-xs font-semibold px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="bg-white rounded-3xl border border-indigo-100 shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">My Friends</h2>
              <span className="text-xs text-gray-500">{friends.length} total</span>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
              {friends.length === 0 && (
                <p className="text-sm text-gray-500">No friends yet. Search usernames and send requests.</p>
              )}

              {friends.map((friend) => (
                <div key={friend.id} className="rounded-xl border border-gray-200 p-3 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-3 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFriendsSet.has(friend.id)}
                      onChange={(event) => {
                        setSelectedFriendIds((prev) => {
                          if (event.target.checked) {
                            return Array.from(new Set([...prev, friend.id]))
                          }
                          return prev.filter((id) => id !== friend.id)
                        })
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <div>
                      <div className="font-medium text-gray-900">{displayName(friend)}</div>
                      <div className="text-xs text-gray-500">{friend.email || 'No email'}</div>
                    </div>
                  </label>
                  <button
                    onClick={() => removeFriend(friend.id)}
                    className="text-xs font-semibold px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-indigo-100 shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Start Group Study Session</h2>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-gray-700">
                <span className="block mb-1">Questions</span>
                <select
                  value={questionCount}
                  onChange={(event) => setQuestionCount(Number(event.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  {[5, 10, 15, 20].map((count) => (
                    <option key={count} value={count}>{count}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-gray-700">
                <span className="block mb-1">Timer per question</span>
                <select
                  value={timeLimitSec}
                  onChange={(event) => setTimeLimitSec(Number(event.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  {[30, 60, 90, 120].map((seconds) => (
                    <option key={seconds} value={seconds}>{seconds}s</option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-gray-700">
                <span className="block mb-1">Module (optional)</span>
                <select
                  value={moduleType}
                  onChange={(event) => setModuleType(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="">Mixed</option>
                  <option value="math">Math</option>
                  <option value="reading-writing">Reading & Writing</option>
                </select>
              </label>

              <label className="text-sm text-gray-700">
                <span className="block mb-1">Difficulty (optional)</span>
                <select
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="">Mixed</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
            </div>

            <label className="block text-sm text-gray-700 mt-3">
              <span className="block mb-1">Category slug (optional)</span>
              <input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="e.g. algebra"
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>

            <button
              onClick={createSession}
              disabled={creatingSession || selectedFriendIds.length === 0}
              className="mt-4 w-full rounded-xl bg-indigo-600 text-white font-semibold py-3 hover:bg-indigo-700 disabled:opacity-50"
            >
              {creatingSession ? 'Creating Session...' : `Create Session with ${selectedFriendIds.length} Friend${selectedFriendIds.length === 1 ? '' : 's'}`}
            </button>
          </section>
        </div>

        <section className="bg-white rounded-3xl border border-indigo-100 shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Session Invites & Active Sessions</h2>

          <div className="space-y-3">
            {studySessions.length === 0 && (
              <p className="text-sm text-gray-500">No active or recent sessions yet.</p>
            )}

            {studySessions.map((studySession) => (
              <div key={studySession.id} className="rounded-xl border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-gray-900">
                    {studySession.status === 'lobby' ? 'Lobby' : studySession.status === 'active' ? 'Live Session' : 'Completed Session'}
                  </div>
                  <div className="text-sm text-gray-600">
                    Host: {studySession.host.username || studySession.host.name || 'Unknown'}
                  </div>
                  <div className="text-xs text-gray-500">
                    Q{Math.min(studySession.currentQuestionIndex + 1, studySession.questionCount)} / {studySession.questionCount}
                    {' • '}
                    {studySession.timeLimitSec ? `${studySession.timeLimitSec}s/question` : 'Untimed'}
                    {studySession.category ? ` • ${studySession.category}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {studySession.inviteStatus === 'invited' ? (
                    <button
                      onClick={() => joinAndOpenSession(studySession.id)}
                      className="text-sm font-semibold px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Accept & Open
                    </button>
                  ) : (
                    <Link
                      href={`/group-study/${studySession.id}`}
                      className="text-sm font-semibold px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      Open
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
