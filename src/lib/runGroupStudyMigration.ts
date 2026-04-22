import type { PrismaClient } from '@prisma/client'

export interface MigrationStepResult {
  sql: string
  result: string
}

function isAlreadyExistsError(message: string): boolean {
  return (
    message.includes('already exists') ||
    message.includes('There is already an object') ||
    message.includes('Column names in each table must be unique') ||
    message.includes('Duplicate column') ||
    message.includes('is already an object named')
  )
}

export async function runGroupStudyMigration(prisma: PrismaClient): Promise<{ success: boolean; steps: MigrationStepResult[] }> {
  const steps: MigrationStepResult[] = []
  let hasErrors = false

  async function exec(label: string, sql: string) {
    try {
      await prisma.$executeRawUnsafe(sql)
      steps.push({ sql: label, result: 'OK' })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (isAlreadyExistsError(message)) {
        steps.push({ sql: label, result: 'SKIPPED (already exists)' })
      } else {
        hasErrors = true
        steps.push({ sql: label, result: `ERROR: ${message}` })
      }
    }
  }

  await exec(
    'CREATE TABLE friend_requests',
    `CREATE TABLE "friend_requests" (
      "id" NVARCHAR(1000) NOT NULL,
      "fromUserId" NVARCHAR(1000) NOT NULL,
      "toUserId" NVARCHAR(1000) NOT NULL,
      "status" NVARCHAR(1000) NOT NULL CONSTRAINT "friend_requests_status_df" DEFAULT 'pending',
      "createdAt" DATETIME2 NOT NULL CONSTRAINT "friend_requests_createdAt_df" DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME2 NOT NULL,
      CONSTRAINT "friend_requests_pkey" PRIMARY KEY ("id")
    )`
  )

  await exec(
    'CREATE TABLE friendships',
    `CREATE TABLE "friendships" (
      "id" NVARCHAR(1000) NOT NULL,
      "userAId" NVARCHAR(1000) NOT NULL,
      "userBId" NVARCHAR(1000) NOT NULL,
      "createdAt" DATETIME2 NOT NULL CONSTRAINT "friendships_createdAt_df" DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "friendships_pkey" PRIMARY KEY ("id")
    )`
  )

  await exec(
    'CREATE TABLE group_study_sessions',
    `CREATE TABLE "group_study_sessions" (
      "id" NVARCHAR(1000) NOT NULL,
      "hostId" NVARCHAR(1000) NOT NULL,
      "status" NVARCHAR(1000) NOT NULL CONSTRAINT "group_study_sessions_status_df" DEFAULT 'lobby',
      "moduleType" NVARCHAR(1000),
      "category" NVARCHAR(1000),
      "difficulty" NVARCHAR(1000),
      "questionCount" INT NOT NULL CONSTRAINT "group_study_sessions_questionCount_df" DEFAULT 10,
      "timeLimitSec" INT,
      "currentQuestionIndex" INT NOT NULL CONSTRAINT "group_study_sessions_currentQuestionIndex_df" DEFAULT 0,
      "currentQuestionStartedAt" DATETIME2,
      "revealStartedAt" DATETIME2,
      "revealEndsAt" DATETIME2,
      "createdAt" DATETIME2 NOT NULL CONSTRAINT "group_study_sessions_createdAt_df" DEFAULT CURRENT_TIMESTAMP,
      "startedAt" DATETIME2,
      "endedAt" DATETIME2,
      CONSTRAINT "group_study_sessions_pkey" PRIMARY KEY ("id")
    )`
  )

  await exec(
    'CREATE TABLE group_study_participants',
    `CREATE TABLE "group_study_participants" (
      "id" NVARCHAR(1000) NOT NULL,
      "sessionId" NVARCHAR(1000) NOT NULL,
      "userId" NVARCHAR(1000) NOT NULL,
      "inviteStatus" NVARCHAR(1000) NOT NULL CONSTRAINT "group_study_participants_inviteStatus_df" DEFAULT 'invited',
      "isReady" BIT NOT NULL CONSTRAINT "group_study_participants_isReady_df" DEFAULT 0,
      "progressStatus" NVARCHAR(1000) NOT NULL CONSTRAINT "group_study_participants_progressStatus_df" DEFAULT 'waiting',
      "joinedAt" DATETIME2,
      "lastSeenAt" DATETIME2,
      "correctCount" INT NOT NULL CONSTRAINT "group_study_participants_correctCount_df" DEFAULT 0,
      "totalResponseMs" INT NOT NULL CONSTRAINT "group_study_participants_totalResponseMs_df" DEFAULT 0,
      "createdAt" DATETIME2 NOT NULL CONSTRAINT "group_study_participants_createdAt_df" DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME2 NOT NULL,
      CONSTRAINT "group_study_participants_pkey" PRIMARY KEY ("id")
    )`
  )

  await exec(
    'CREATE TABLE group_study_questions',
    `CREATE TABLE "group_study_questions" (
      "id" NVARCHAR(1000) NOT NULL,
      "sessionId" NVARCHAR(1000) NOT NULL,
      "questionId" NVARCHAR(1000) NOT NULL,
      "orderIndex" INT NOT NULL,
      CONSTRAINT "group_study_questions_pkey" PRIMARY KEY ("id")
    )`
  )

  await exec(
    'CREATE TABLE group_study_answers',
    `CREATE TABLE "group_study_answers" (
      "id" NVARCHAR(1000) NOT NULL,
      "sessionId" NVARCHAR(1000) NOT NULL,
      "groupStudyQuestionId" NVARCHAR(1000) NOT NULL,
      "userId" NVARCHAR(1000) NOT NULL,
      "selectedAnswer" INT,
      "isCorrect" BIT,
      "responseTimeMs" INT,
      "answeredAt" DATETIME2 NOT NULL CONSTRAINT "group_study_answers_answeredAt_df" DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "group_study_answers_pkey" PRIMARY KEY ("id")
    )`
  )

  await exec(
    'CREATE UNIQUE INDEX friend_requests_fromUserId_toUserId_key',
    `CREATE UNIQUE INDEX "friend_requests_fromUserId_toUserId_key" ON "friend_requests"("fromUserId", "toUserId")`
  )
  await exec(
    'CREATE INDEX friend_requests_toUserId_status_idx',
    `CREATE INDEX "friend_requests_toUserId_status_idx" ON "friend_requests"("toUserId", "status")`
  )
  await exec(
    'CREATE INDEX friend_requests_fromUserId_status_idx',
    `CREATE INDEX "friend_requests_fromUserId_status_idx" ON "friend_requests"("fromUserId", "status")`
  )

  await exec(
    'CREATE UNIQUE INDEX friendships_userAId_userBId_key',
    `CREATE UNIQUE INDEX "friendships_userAId_userBId_key" ON "friendships"("userAId", "userBId")`
  )
  await exec('CREATE INDEX friendships_userAId_idx', `CREATE INDEX "friendships_userAId_idx" ON "friendships"("userAId")`)
  await exec('CREATE INDEX friendships_userBId_idx', `CREATE INDEX "friendships_userBId_idx" ON "friendships"("userBId")`)

  await exec(
    'CREATE INDEX group_study_sessions_hostId_createdAt_idx',
    `CREATE INDEX "group_study_sessions_hostId_createdAt_idx" ON "group_study_sessions"("hostId", "createdAt")`
  )
  await exec(
    'CREATE INDEX group_study_sessions_status_createdAt_idx',
    `CREATE INDEX "group_study_sessions_status_createdAt_idx" ON "group_study_sessions"("status", "createdAt")`
  )
  await exec(
    'CREATE UNIQUE INDEX group_study_participants_sessionId_userId_key',
    `CREATE UNIQUE INDEX "group_study_participants_sessionId_userId_key" ON "group_study_participants"("sessionId", "userId")`
  )
  await exec(
    'CREATE INDEX group_study_participants_userId_inviteStatus_idx',
    `CREATE INDEX "group_study_participants_userId_inviteStatus_idx" ON "group_study_participants"("userId", "inviteStatus")`
  )
  await exec(
    'CREATE INDEX group_study_participants_sessionId_inviteStatus_idx',
    `CREATE INDEX "group_study_participants_sessionId_inviteStatus_idx" ON "group_study_participants"("sessionId", "inviteStatus")`
  )
  await exec(
    'CREATE UNIQUE INDEX group_study_questions_sessionId_orderIndex_key',
    `CREATE UNIQUE INDEX "group_study_questions_sessionId_orderIndex_key" ON "group_study_questions"("sessionId", "orderIndex")`
  )
  await exec(
    'CREATE UNIQUE INDEX group_study_questions_sessionId_questionId_key',
    `CREATE UNIQUE INDEX "group_study_questions_sessionId_questionId_key" ON "group_study_questions"("sessionId", "questionId")`
  )
  await exec(
    'CREATE INDEX group_study_questions_questionId_idx',
    `CREATE INDEX "group_study_questions_questionId_idx" ON "group_study_questions"("questionId")`
  )
  await exec(
    'CREATE UNIQUE INDEX group_study_answers_groupStudyQuestionId_userId_key',
    `CREATE UNIQUE INDEX "group_study_answers_groupStudyQuestionId_userId_key" ON "group_study_answers"("groupStudyQuestionId", "userId")`
  )
  await exec(
    'CREATE INDEX group_study_answers_sessionId_userId_idx',
    `CREATE INDEX "group_study_answers_sessionId_userId_idx" ON "group_study_answers"("sessionId", "userId")`
  )

  await exec(
    'ADD FK friend_requests_fromUserId_fkey',
    `ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
  )
  await exec(
    'ADD FK friend_requests_toUserId_fkey',
    `ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
  )

  await exec(
    'ADD FK friendships_userAId_fkey',
    `ALTER TABLE "friendships" ADD CONSTRAINT "friendships_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
  )
  await exec(
    'ADD FK friendships_userBId_fkey',
    `ALTER TABLE "friendships" ADD CONSTRAINT "friendships_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
  )

  await exec(
    'ADD FK group_study_sessions_hostId_fkey',
    `ALTER TABLE "group_study_sessions" ADD CONSTRAINT "group_study_sessions_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
  )

  await exec(
    'ADD FK group_study_participants_sessionId_fkey',
    `ALTER TABLE "group_study_participants" ADD CONSTRAINT "group_study_participants_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "group_study_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE`
  )
  await exec(
    'ADD FK group_study_participants_userId_fkey',
    `ALTER TABLE "group_study_participants" ADD CONSTRAINT "group_study_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
  )

  await exec(
    'ADD FK group_study_questions_sessionId_fkey',
    `ALTER TABLE "group_study_questions" ADD CONSTRAINT "group_study_questions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "group_study_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE`
  )
  await exec(
    'ADD FK group_study_questions_questionId_fkey',
    `ALTER TABLE "group_study_questions" ADD CONSTRAINT "group_study_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
  )

  await exec(
    'ADD FK group_study_answers_sessionId_fkey',
    `ALTER TABLE "group_study_answers" ADD CONSTRAINT "group_study_answers_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "group_study_sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
  )
  await exec(
    'ADD FK group_study_answers_groupStudyQuestionId_fkey',
    `ALTER TABLE "group_study_answers" ADD CONSTRAINT "group_study_answers_groupStudyQuestionId_fkey" FOREIGN KEY ("groupStudyQuestionId") REFERENCES "group_study_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE`
  )
  await exec(
    'ADD FK group_study_answers_userId_fkey',
    `ALTER TABLE "group_study_answers" ADD CONSTRAINT "group_study_answers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
  )

  return { success: !hasErrors, steps }
}
