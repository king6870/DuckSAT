-- AlterTable: Add referral fields to users table (idempotent - safe to run multiple times)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'referralCode')
BEGIN
  ALTER TABLE "users" ADD "referralCode" NVARCHAR(1000);
END

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'referredByCode')
BEGIN
  ALTER TABLE "users" ADD "referredByCode" NVARCHAR(1000);
END

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'bonusPracticeTests')
BEGIN
  ALTER TABLE "users" ADD "bonusPracticeTests" INT NOT NULL DEFAULT 0;
END

-- CreateIndex: unique referral code per user (idempotent)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'users_referralCode_key' AND object_id = OBJECT_ID('users'))
BEGIN
  CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode") WHERE "referralCode" IS NOT NULL;
END

-- CreateTable: referrals tracking (idempotent)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'referrals')
BEGIN
  CREATE TABLE "referrals" (
      "id" NVARCHAR(1000) NOT NULL,
      "referrerId" NVARCHAR(1000) NOT NULL,
      "refereeId" NVARCHAR(1000) NOT NULL,
      "codeUsed" NVARCHAR(1000) NOT NULL,
      "awardedAt" DATETIME2 NOT NULL CONSTRAINT "referrals_awardedAt_df" DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
  );
END

-- CreateIndex: unique referral per new user (idempotent)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'referrals_refereeId_key' AND object_id = OBJECT_ID('referrals'))
BEGIN
  CREATE UNIQUE INDEX "referrals_refereeId_key" ON "referrals"("refereeId");
END

-- CreateIndex: referrer lookup (idempotent)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'referrals_referrerId_idx' AND object_id = OBJECT_ID('referrals'))
BEGIN
  CREATE INDEX "referrals_referrerId_idx" ON "referrals"("referrerId");
END

-- AddForeignKey (idempotent)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'referrals_referrerId_fkey')
BEGIN
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
END

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'referrals_refereeId_fkey')
BEGIN
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
END
