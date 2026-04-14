import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ADMIN_EMAILS } from '@/constants/adminEmails'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/admin/run-referral-migration
 * One-time endpoint to apply the referral schema migration to Azure SQL.
 * Safe to call multiple times — each statement is wrapped in a try-catch.
 * Requires admin session.
 */
export async function POST() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email ?? ''
  if (!ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const steps: { sql: string; result: string }[] = []

  async function exec(label: string, sql: string) {
    try {
      await prisma.$executeRawUnsafe(sql)
      steps.push({ sql: label, result: 'OK' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      // Ignore "column already exists" and "object already exists" errors
      if (
        msg.includes('already exists') ||
        msg.includes('Column names in each table must be unique') ||
        msg.includes('There is already an object')
      ) {
        steps.push({ sql: label, result: 'SKIPPED (already exists)' })
      } else {
        steps.push({ sql: label, result: `ERROR: ${msg}` })
        throw err
      }
    }
  }

  try {
    await exec(
      'ALTER users ADD referralCode',
      `ALTER TABLE "users" ADD "referralCode" NVARCHAR(1000)`
    )
    await exec(
      'ALTER users ADD referredByCode',
      `ALTER TABLE "users" ADD "referredByCode" NVARCHAR(1000)`
    )
    await exec(
      'ALTER users ADD bonusPracticeTests',
      `ALTER TABLE "users" ADD "bonusPracticeTests" INT NOT NULL DEFAULT 0`
    )
    await exec(
      'CREATE INDEX users_referralCode_key',
      `CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode") WHERE "referralCode" IS NOT NULL`
    )
    await exec(
      'CREATE TABLE referrals',
      `CREATE TABLE "referrals" (
        "id" NVARCHAR(1000) NOT NULL,
        "referrerId" NVARCHAR(1000) NOT NULL,
        "refereeId" NVARCHAR(1000) NOT NULL,
        "codeUsed" NVARCHAR(1000) NOT NULL,
        "awardedAt" DATETIME2 NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
      )`
    )
    await exec(
      'CREATE INDEX referrals_refereeId_key',
      `CREATE UNIQUE INDEX "referrals_refereeId_key" ON "referrals"("refereeId")`
    )
    await exec(
      'CREATE INDEX referrals_referrerId_idx',
      `CREATE INDEX "referrals_referrerId_idx" ON "referrals"("referrerId")`
    )
    await exec(
      'ADD FK referrals_referrerId_fkey',
      `ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    )
    await exec(
      'ADD FK referrals_refereeId_fkey',
      `ALTER TABLE "referrals" ADD CONSTRAINT "referrals_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    )

    return NextResponse.json({ success: true, steps })
  } catch (err) {
    return NextResponse.json({ success: false, steps, error: String(err) }, { status: 500 })
  }
}
