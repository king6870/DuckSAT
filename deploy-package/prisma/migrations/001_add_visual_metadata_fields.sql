-- Database Migration Script for Epic #34: Diverse Question Types & Practice Test Integration
-- File: migrations/001_add_visual_metadata_fields.sql
-- Date: 2026-02-17
-- Description: Adds visualType and difficultyScore columns to questions table for V3 generator support

-- IMPORTANT: Run this on STAGING environment first, then verify before production deployment

-- ===========================
-- STEP 1: Add New Columns
-- ===========================

-- Add visualType column (nullable for backward compatibility with existing V2 questions)
ALTER TABLE questions ADD visualType NVARCHAR(50) NULL;

-- Add difficultyScore column (numeric representation of difficulty, nullable)
-- Maps: easy → 25, medium → 50, hard → 75
ALTER TABLE questions ADD difficultyScore INT NULL;

-- Note: 'subtopic' column already exists in schema (line 116 in schema.prisma)

-- ===========================
-- STEP 2: Create Indexes for Performance
-- ===========================

-- Index for filtering by visual type
CREATE INDEX idx_questions_visual_type ON questions(visualType) WHERE visualType IS NOT NULL;

-- Index for practice test queries (multi-column for common filter combinations)
CREATE INDEX idx_questions_practice_filters ON questions(moduleType, visualType, difficultyScore) 
  WHERE isActive = 1 AND visualType IS NOT NULL;

-- Index for subtopic filtering (if not already exists)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_questions_subtopic' AND object_id = OBJECT_ID('questions'))
BEGIN
  CREATE INDEX idx_questions_subtopic ON questions(subtopic) WHERE subtopic IS NOT NULL;
END;

-- ===========================
-- STEP 3: Backfill Existing Questions
-- ===========================

-- Backfill difficultyScore from existing difficulty column
UPDATE questions
SET difficultyScore = 
  CASE difficulty
    WHEN 'easy' THEN 25
    WHEN 'medium' THEN 50
    WHEN 'hard' THEN 75
    ELSE 50 -- Default to medium if unknown
  END
WHERE difficultyScore IS NULL;

-- Backfill visualType for existing V2 geometry questions
-- (All existing questions with imageData are geometry diagrams)
UPDATE questions
SET visualType = 'geometry'
WHERE visualType IS NULL 
  AND (imageData IS NOT NULL OR imageUrl IS NOT NULL);

-- Mark text-only questions (no diagrams)
UPDATE questions
SET visualType = 'none'
WHERE visualType IS NULL 
  AND imageData IS NULL 
  AND imageUrl IS NULL;

-- ===========================
-- STEP 4: Verification Queries
-- ===========================

-- Run these after migration to verify success:

-- Check column existence
-- SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
-- FROM INFORMATION_SCHEMA.COLUMNS
-- WHERE TABLE_NAME = 'questions' 
--   AND COLUMN_NAME IN ('visualType', 'difficultyScore');

-- Check index creation
-- SELECT i.name AS IndexName, i.type_desc AS IndexType, COL_NAME(ic.object_id, ic.column_id) AS ColumnName
-- FROM sys.indexes AS i
-- INNER JOIN sys.index_columns AS ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
-- WHERE i.object_id = OBJECT_ID('questions')
--   AND i.name LIKE 'idx_questions_%';

-- Check backfill statistics
-- SELECT 
--   visualType,
--   COUNT(*) AS QuestionCount,
--   AVG(CAST(difficultyScore AS FLOAT)) AS AvgDifficultyScore
-- FROM questions
-- WHERE isActive = 1
-- GROUP BY visualType
-- ORDER BY QuestionCount DESC;

-- Check for NULL values (should be minimal after backfill)
-- SELECT 
--   COUNT(*) AS TotalQuestions,
--   SUM(CASE WHEN visualType IS NULL THEN 1 ELSE 0 END) AS NullVisualType,
--   SUM(CASE WHEN difficultyScore IS NULL THEN 1 ELSE 0 END) AS NullDifficultyScore
-- FROM questions;

-- ===========================
-- ROLLBACK SCRIPT (Emergency Use Only)
-- ===========================

-- UNCOMMENT AND RUN ONLY IF MIGRATION NEEDS TO BE ROLLED BACK:

-- DROP INDEX IF EXISTS idx_questions_visual_type ON questions;
-- DROP INDEX IF EXISTS idx_questions_practice_filters ON questions;
-- -- Note: Do not drop idx_questions_subtopic if it existed before this migration
-- 
-- ALTER TABLE questions DROP COLUMN IF EXISTS visualType;
-- ALTER TABLE questions DROP COLUMN IF EXISTS difficultyScore;

-- ===========================
-- MIGRATION EXECUTION CHECKLIST
-- ===========================

-- [ ] 1. Backup production database: 
--        az sql db export --resource-group <rg> --server db-ducksat --database DuckSAT_DB --admin-user lionvihaan --admin-password <pass> --storage-key <key> --storage-key-type StorageAccessKey --storage-uri https://<account>.blob.core.windows.net/backups/pre-migration-{timestamp}.bacpac

-- [ ] 2. Test on staging replica:
--        sqlcmd -S db-ducksat-staging.database.windows.net -d DuckSAT_DB_Staging -U lionvihaan -P Microsoft757 -i migrations/001_add_visual_metadata_fields.sql

-- [ ] 3. Verify staging data:
--        Run verification queries (see STEP 4 above)

-- [ ] 4. Update Prisma schema:
--        Add new fields to Question model in prisma/schema.prisma

-- [ ] 5. Regenerate Prisma client:
--        npx prisma db pull (to sync schema from database)
--        npx prisma generate (to regenerate TypeScript types)

-- [ ] 6. Deploy to production during maintenance window:
--        sqlcmd -S db-ducksat.database.windows.net -d DuckSAT_DB -U lionvihaan -P Microsoft757 -i migrations/001_add_visual_metadata_fields.sql

-- [ ] 7. Verify production deployment:
--        Run verification queries on production database

-- [ ] 8. Deploy updated application code:
--        Deploy Next.js app with new API endpoints and Prisma schema

-- ===========================
-- NOTES
-- ===========================

-- - All columns are nullable to maintain backward compatibility
-- - Existing V2 questions will have visualType='geometry' or 'none'
-- - New V3 questions will have 8+ visual types (bar-chart, scatter-plot, function-graph, etc.)
-- - difficultyScore enables numeric sorting/filtering (25 = easy, 50 = medium, 75 = hard)
-- - Indexes are filtered (WHERE clauses) to improve query performance
-- - Backfill logic is conservative and safe (existing questions remain unchanged)

-- End of migration script
