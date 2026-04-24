import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import assert from 'node:assert/strict'

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

type TestClient = {
  username: string
  password: string
  cookies: Map<string, string>
  userId: string
}

const prisma = new PrismaClient()
const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

const createdUserIds: string[] = []
const touchedSessionIds: string[] = []

function parseSetCookie(setCookie: string): { name: string; value: string } | null {
  const first = setCookie.split(';')[0]
  const eqIndex = first.indexOf('=')
  if (eqIndex <= 0) return null
  return {
    name: first.slice(0, eqIndex).trim(),
    value: first.slice(eqIndex + 1).trim(),
  }
}

function cookieHeader(client: TestClient): string {
  return Array.from(client.cookies.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ')
}

function updateCookies(client: TestClient, response: Response) {
  const getSetCookie = (response.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie
  const setCookies = typeof getSetCookie === 'function'
    ? getSetCookie.call(response.headers)
    : [response.headers.get('set-cookie') || '']

  for (const raw of setCookies) {
    if (!raw) continue
    const parsed = parseSetCookie(raw)
    if (parsed) {
      client.cookies.set(parsed.name, parsed.value)
    }
  }
}

async function apiRequest<T>(client: TestClient, method: HttpMethod, path: string, body?: unknown): Promise<{ status: number; json: T }> {
  const headers: Record<string, string> = {}
  const cookie = cookieHeader(client)
  if (cookie) headers.Cookie = cookie
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  updateCookies(client, response)

  let parsed: T
  try {
    parsed = (await response.json()) as T
  } catch {
    parsed = {} as T
  }

  return { status: response.status, json: parsed }
}

async function createUserClient(label: string): Promise<TestClient> {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(0, 10)
  const username = `${label}${suffix}`.slice(0, 18)
  const password = 'Passw0rd!123'
  const passwordHash = await hash(password, 10)

  const user = await prisma.user.create({
    data: {
      username,
      name: username,
      email: `${username}@duck.local`,
      passwordHash,
    },
    select: { id: true },
  })

  createdUserIds.push(user.id)

  const client: TestClient = {
    username,
    password,
    cookies: new Map(),
    userId: user.id,
  }

  const csrfRes = await fetch(`${API_BASE}/api/auth/csrf`)
  updateCookies(client, csrfRes)
  const csrfJson = (await csrfRes.json()) as { csrfToken: string }

  const body = new URLSearchParams({
    csrfToken: csrfJson.csrfToken,
    username,
    password,
    callbackUrl: `${API_BASE}/friends`,
    json: 'true',
  })

  const signInRes = await fetch(`${API_BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookieHeader(client),
    },
    body,
  })

  updateCookies(client, signInRes)
  assert.equal(signInRes.status, 200, `Credential signin failed for ${username}`)

  const sessionRes = await fetch(`${API_BASE}/api/auth/session`, {
    headers: { Cookie: cookieHeader(client) },
  })
  const sessionJson = await sessionRes.json() as { user?: { id?: string } }
  assert.equal(sessionRes.status, 200, `Session endpoint failed for ${username}`)
  assert.equal(sessionJson.user?.id, user.id, `Session user mismatch for ${username}`)

  return client
}

async function expectStatus<T>(
  client: TestClient,
  method: HttpMethod,
  path: string,
  expectedStatus: number,
  body?: unknown
): Promise<T> {
  const result = await apiRequest<T>(client, method, path, body)
  assert.equal(
    result.status,
    expectedStatus,
    `${method} ${path} expected ${expectedStatus} but got ${result.status}; body=${JSON.stringify(result.json)}`
  )
  return result.json
}

async function waitForReveal(host: TestClient, sessionId: string): Promise<void> {
  for (let i = 0; i < 8; i++) {
    const payload = await expectStatus<{
      session: { isRevealPhase: boolean; canRevealAnswers: boolean }
      answersByUser: Array<{ userId: string; selectedAnswer: number | null }>
    }>(host, 'GET', `/api/group-study/sessions/${sessionId}`, 200)

    if (payload.session.isRevealPhase && payload.session.canRevealAnswers) {
      assert(payload.answersByUser.length >= 2, 'Expected answers for both participants in reveal phase')
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 800))
  }

  throw new Error('Session did not enter reveal phase after both answers')
}

async function cleanup() {
  if (touchedSessionIds.length > 0) {
    await prisma.groupStudyAnswer.deleteMany({ where: { sessionId: { in: touchedSessionIds } } })
    await prisma.groupStudyQuestion.deleteMany({ where: { sessionId: { in: touchedSessionIds } } })
    await prisma.groupStudyParticipant.deleteMany({ where: { sessionId: { in: touchedSessionIds } } })
    await prisma.groupStudySession.deleteMany({ where: { id: { in: touchedSessionIds } } })
  }

  if (createdUserIds.length > 0) {
    await prisma.friendRequest.deleteMany({
      where: {
        OR: [{ fromUserId: { in: createdUserIds } }, { toUserId: { in: createdUserIds } }],
      },
    })
    await prisma.friendship.deleteMany({
      where: {
        OR: [{ userAId: { in: createdUserIds } }, { userBId: { in: createdUserIds } }],
      },
    })
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } })
  }
}

async function main() {
  console.log('=== Friends + Study Together integration test start ===')
  const healthRes = await fetch(`${API_BASE}/api/health`)
  assert.equal(healthRes.status, 200, 'Expected /api/health to be 200 before test run')

  const userA = await createUserClient('fa')
  const userB = await createUserClient('fb')
  const userC = await createUserClient('fc')
  console.log('Authenticated users created:', userA.username, userB.username, userC.username)

  const searchByUsername = await expectStatus<{ users: Array<{ id: string }> }>(
    userA,
    'GET',
    `/api/users/search?query=${encodeURIComponent(userB.username.slice(0, 3))}`,
    200
  )
  assert(
    searchByUsername.users.some((user) => user.id === userB.userId),
    'Search by username fragment should find User B'
  )

  const searchByName = await expectStatus<{ users: Array<{ id: string }> }>(
    userA,
    'GET',
    `/api/users/search?query=${encodeURIComponent(userB.username)}`,
    200
  )
  assert(
    searchByName.users.some((user) => user.id === userB.userId),
    'Search by name should find User B'
  )

  const searchByAtUsername = await expectStatus<{ users: Array<{ id: string }> }>(
    userA,
    'GET',
    `/api/users/search?query=${encodeURIComponent(`@${userB.username.slice(0, 4)}`)}`,
    200
  )
  assert(
    searchByAtUsername.users.some((user) => user.id === userB.userId),
    'Search by @username fragment should find User B'
  )

  const searchBySingleCharacter = await expectStatus<{ users: Array<{ id: string }> }>(
    userA,
    'GET',
    `/api/users/search?query=${encodeURIComponent(userB.username.slice(0, 1))}`,
    200
  )
  assert(
    searchBySingleCharacter.users.some((user) => user.id === userB.userId),
    'Search by one character should find User B'
  )

  const searchByUppercase = await expectStatus<{ users: Array<{ id: string }> }>(
    userA,
    'GET',
    `/api/users/search?query=${encodeURIComponent(userB.username.slice(0, 3).toUpperCase())}`,
    200
  )
  assert(
    searchByUppercase.users.some((user) => user.id === userB.userId),
    'Search by uppercase username fragment should find User B'
  )

  const searchByEmail = await expectStatus<{ users: Array<{ id: string; email?: string | null }> }>(
    userA,
    'GET',
    '/api/users/search?query=duck.local',
    200
  )
  assert(
    searchByEmail.users.some((user) => user.id === userB.userId),
    'Search by email domain should find User B'
  )

  const initialFriends = await expectStatus<{ friends: Array<{ id: string }> }>(userA, 'GET', '/api/friends', 200)
  assert.equal(initialFriends.friends.length, 0, 'User A should start with zero friends')

  const requestCreate = await expectStatus<{ success?: boolean }>(
    userA,
    'POST',
    '/api/friends/requests',
    200,
    { toUserId: userB.userId }
  )
  assert.equal(requestCreate.success, true, 'Friend request creation should succeed')

  const userBRequests = await expectStatus<{
    incoming: Array<{ id: string; fromUser: { id: string } }>
  }>(userB, 'GET', '/api/friends/requests', 200)
  const incoming = userBRequests.incoming.find((request) => request.fromUser.id === userA.userId)
  assert(incoming, 'User B should have incoming request from User A')

  const acceptResult = await expectStatus<{ success?: boolean }>(
    userB,
    'PATCH',
    `/api/friends/requests/${incoming.id}`,
    200,
    { action: 'accept' }
  )
  assert.equal(acceptResult.success, true, 'Accepting friend request should succeed')

  const friendsAfterAccept = await expectStatus<{ friends: Array<{ id: string }> }>(userA, 'GET', '/api/friends', 200)
  assert(friendsAfterAccept.friends.some((friend) => friend.id === userB.userId), 'User B should appear in User A friend list')

  const forbiddenInvite = await apiRequest<{ error?: string }>(
    userA,
    'POST',
    '/api/group-study/sessions',
    {
      invitedUserIds: [userC.userId],
      questionCount: 5,
      timeLimitSec: 30,
      moduleType: 'math',
      difficulty: 'easy',
    }
  )
  assert.equal(forbiddenInvite.status, 403, 'Inviting non-friend should be forbidden')
  assert.equal(forbiddenInvite.json.error, 'can_only_invite_friends')

  const createSessionPayload = await expectStatus<{ success: boolean; sessionId: string }>(
    userA,
    'POST',
    '/api/group-study/sessions',
    200,
    {
      invitedUserIds: [userB.userId],
      questionCount: 5,
      timeLimitSec: 30,
      moduleType: 'math',
      difficulty: 'easy',
    }
  )
  assert.equal(createSessionPayload.success, true)
  assert(createSessionPayload.sessionId, 'Session creation should return sessionId')
  const sessionId = createSessionPayload.sessionId
  touchedSessionIds.push(sessionId)

  const userBSessions = await expectStatus<{
    sessions: Array<{ id: string; inviteStatus: string }>
  }>(userB, 'GET', '/api/group-study/sessions', 200)
  const invitedSession = userBSessions.sessions.find((session) => session.id === sessionId)
  assert(invitedSession, 'User B should see invited session')

  await expectStatus<{ success: boolean }>(userB, 'POST', `/api/group-study/sessions/${sessionId}/join`, 200)

  const startPayload = await expectStatus<{ success: boolean }>(userA, 'POST', `/api/group-study/sessions/${sessionId}/start`, 200)
  assert.equal(startPayload.success, true, 'Host should start session successfully')

  const stateAfterStart = await expectStatus<{
    session: { status: string }
    currentQuestion: { id: string } | null
  }>(userA, 'GET', `/api/group-study/sessions/${sessionId}`, 200)
  assert.equal(stateAfterStart.session.status, 'active', 'Session should be active after host starts')
  assert(stateAfterStart.currentQuestion, 'Current question should be present in active session')

  const answerA = await expectStatus<{ success: boolean }>(
    userA,
    'POST',
    `/api/group-study/sessions/${sessionId}/answer`,
    200,
    { selectedAnswer: 0 }
  )
  assert.equal(answerA.success, true)

  const duplicateAnswer = await apiRequest<{ error?: string }>(
    userA,
    'POST',
    `/api/group-study/sessions/${sessionId}/answer`,
    { selectedAnswer: 1 }
  )
  assert.equal(duplicateAnswer.status, 409, 'Duplicate answer should be rejected')
  assert.equal(duplicateAnswer.json.error, 'already_answered')

  await expectStatus<{ success: boolean }>(
    userB,
    'POST',
    `/api/group-study/sessions/${sessionId}/answer`,
    200,
    { selectedAnswer: 1 }
  )

  await waitForReveal(userA, sessionId)

  const leaveB = await expectStatus<{ success: boolean }>(userB, 'POST', `/api/group-study/sessions/${sessionId}/leave`, 200)
  assert.equal(leaveB.success, true)

  const leaveA = await expectStatus<{ success: boolean; hostEndedSession?: boolean }>(
    userA,
    'POST',
    `/api/group-study/sessions/${sessionId}/leave`,
    200
  )
  assert.equal(leaveA.success, true)
  assert.equal(leaveA.hostEndedSession, true, 'Host leave should end session when session is not completed')

  const removeFriendResult = await expectStatus<{ success: boolean }>(
    userA,
    'DELETE',
    `/api/friends/${userB.userId}`,
    200
  )
  assert.equal(removeFriendResult.success, true)

  const friendsAfterRemove = await expectStatus<{ friends: Array<{ id: string }> }>(userA, 'GET', '/api/friends', 200)
  assert(!friendsAfterRemove.friends.some((friend) => friend.id === userB.userId), 'Friend should be removed after DELETE')

  console.log('=== Friends + Study Together integration test passed ===')
}

main()
  .catch((error) => {
    console.error('Integration test failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    try {
      await cleanup()
    } catch (cleanupError) {
      console.error('Cleanup failed:', cleanupError)
    }
    await prisma.$disconnect()
  })
