-- Migration: add_user_feedback
-- Adds feedbackSubmittedAt to users + creates user_feedback table

-- 1. Add feedbackSubmittedAt column to users (safe, nullable)
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID(N'[dbo].[users]')
    AND name = N'feedbackSubmittedAt'
)
BEGIN
  ALTER TABLE [dbo].[users] ADD [feedbackSubmittedAt] DATETIME2;
  PRINT 'Added feedbackSubmittedAt to users';
END
ELSE
  PRINT 'feedbackSubmittedAt already exists on users - skipping';

-- 2. Create user_feedback table
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'user_feedback' AND type = 'U')
BEGIN
  CREATE TABLE [dbo].[user_feedback] (
    [id]          NVARCHAR(1000) NOT NULL,
    [userId]      NVARCHAR(1000),
    [sessionId]   NVARCHAR(1000),
    [rating]      INT            NOT NULL,
    [review]      NVARCHAR(MAX),
    [userAgent]   NVARCHAR(MAX),
    [pageUrl]     NVARCHAR(1000),
    [submittedAt] DATETIME2 NOT NULL CONSTRAINT [user_feedback_submittedAt_df] DEFAULT GETDATE(),
    CONSTRAINT [user_feedback_pkey] PRIMARY KEY ([id])
  );
  PRINT 'Created user_feedback table';
END
ELSE
  PRINT 'user_feedback table already exists - skipping';

-- 3. Indexes on user_feedback
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[user_feedback]') AND name = N'user_feedback_userId_idx')
BEGIN
  CREATE INDEX [user_feedback_userId_idx] ON [dbo].[user_feedback] ([userId]);
  PRINT 'Created user_feedback_userId_idx';
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[user_feedback]') AND name = N'user_feedback_sessionId_idx')
BEGIN
  CREATE INDEX [user_feedback_sessionId_idx] ON [dbo].[user_feedback] ([sessionId]);
  PRINT 'Created user_feedback_sessionId_idx';
END

-- 4. Foreign key: user_feedback.userId -> users.id (SET NULL on delete)
IF NOT EXISTS (
  SELECT 1 FROM sys.foreign_keys
  WHERE name = N'user_feedback_userId_fkey'
    AND parent_object_id = OBJECT_ID(N'[dbo].[user_feedback]')
)
BEGIN
  ALTER TABLE [dbo].[user_feedback]
    ADD CONSTRAINT [user_feedback_userId_fkey]
    FOREIGN KEY ([userId]) REFERENCES [dbo].[users]([id]) ON DELETE SET NULL;
  PRINT 'Added FK user_feedback_userId_fkey';
END
ELSE
  PRINT 'FK user_feedback_userId_fkey already exists - skipping';

PRINT 'Migration complete.';
