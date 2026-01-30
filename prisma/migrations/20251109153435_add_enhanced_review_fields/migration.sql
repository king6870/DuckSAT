-- AlterTable
-- Add new review fields to questions table for enhanced admin review workflow
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "reviewRating" INTEGER,
ADD COLUMN IF NOT EXISTS "diagramAccurate" BOOLEAN;
