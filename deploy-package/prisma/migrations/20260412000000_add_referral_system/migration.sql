-- AlterTable: Add referral fields to users table
ALTER TABLE "users" ADD "referralCode" NVARCHAR(1000);
ALTER TABLE "users" ADD "referredByCode" NVARCHAR(1000);
ALTER TABLE "users" ADD "bonusPracticeTests" INT NOT NULL DEFAULT 0;

-- CreateIndex: unique referral code per user
CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode") WHERE "referralCode" IS NOT NULL;

-- CreateTable: referrals tracking
CREATE TABLE "referrals" (
    "id" NVARCHAR(1000) NOT NULL,
    "referrerId" NVARCHAR(1000) NOT NULL,
    "refereeId" NVARCHAR(1000) NOT NULL,
    "codeUsed" NVARCHAR(1000) NOT NULL,
    "awardedAt" DATETIME2 NOT NULL CONSTRAINT "referrals_awardedAt_df" DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique referral per new user
CREATE UNIQUE INDEX "referrals_refereeId_key" ON "referrals"("refereeId");

-- CreateIndex: referrer lookup
CREATE INDEX "referrals_referrerId_idx" ON "referrals"("referrerId");

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
