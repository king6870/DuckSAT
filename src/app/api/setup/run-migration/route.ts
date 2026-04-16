import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/setup/run-migration?secret=<SETUP_MIGRATION_SECRET>
 *
 * One-time endpoint to apply the referral DB migration to Azure SQL.
 * Does NOT require user authentication — protected only by the SETUP_MIGRATION_SECRET
 * environment variable (set in Azure App Service → Configuration → Application settings).
 *
 * Usage:
 *   1. Set SETUP_MIGRATION_SECRET=<random-value> in Azure App Settings
 *   2. Visit https://www.ducksat.com/api/setup/run-migration?secret=<random-value>
 *   3. Check the JSON response — each step shows OK or SKIPPED
 *   4. After success, sign-in will work again (remove SETUP_MIGRATION_SECRET if desired)
 */
export async function GET(req: NextRequest) {
  const secret = process.env.SETUP_MIGRATION_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: 'SETUP_MIGRATION_SECRET is not configured in environment variables.' },
      { status: 403 }
    )
  }

  const provided = req.nextUrl.searchParams.get('secret')
  if (!provided || provided !== secret) {
    return NextResponse.json({ error: 'Invalid or missing secret.' }, { status: 403 })
  }

  const steps: { sql: string; result: string }[] = []

  async function exec(label: string, sql: string) {
    try {
      await prisma.$executeRawUnsafe(sql)
      steps.push({ sql: label, result: 'OK' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (
        msg.includes('already exists') ||
        msg.includes('Column names in each table must be unique') ||
        msg.includes('There is already an object') ||
        msg.includes('Duplicate column')
      ) {
        steps.push({ sql: label, result: 'SKIPPED (already exists)' })
      } else {
        steps.push({ sql: label, result: `ERROR: ${msg}` })
      }
    }
  }

  await exec('ALTER users ADD referralCode', `ALTER TABLE "users" ADD "referralCode" NVARCHAR(1000)`)
  await exec('ALTER users ADD referredByCode', `ALTER TABLE "users" ADD "referredByCode" NVARCHAR(1000)`)
  await exec('ALTER users ADD bonusPracticeTests', `ALTER TABLE "users" ADD "bonusPracticeTests" INT NOT NULL DEFAULT 0`)
  await exec(
    'CREATE UNIQUE INDEX users_referralCode_key',
    `CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode") WHERE "referralCode" IS NOT NULL`
  )
  await exec(
    'CREATE TABLE referrals',
    `CREATE TABLE "referrals" (
      "id" NVARCHAR(1000) NOT NULL,
      "referrerId" NVARCHAR(1000) NOT NULL,
      "refereeId" NVARCHAR(1000) NOT NULL,
      "codeUsed" NVARCHAR(1000) NOT NULL,
      "awardedAt" DATETIME2 NOT NULL CONSTRAINT "referrals_awardedAt_df" DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
    )`
  )
  await exec(
    'CREATE UNIQUE INDEX referrals_refereeId_key',
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

  const allOk = steps.every(s => s.result === 'OK' || s.result.startsWith('SKIPPED'))

  return NextResponse.json({ success: allOk, steps })
}
