-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "imageData" BYTEA,
ADD COLUMN     "imageMimeType" TEXT;

-- Update existing questions with filesystem-based images to set mime type
UPDATE "questions" 
SET "imageMimeType" = 'image/svg+xml' 
WHERE "imageUrl" IS NOT NULL 
  AND "imageUrl" LIKE '%.svg';

UPDATE "questions" 
SET "imageMimeType" = 'image/png' 
WHERE "imageUrl" IS NOT NULL 
  AND "imageUrl" LIKE '%.png';
