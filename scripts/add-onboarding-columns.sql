-- Add onboarding survey columns to users table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'onboardingCompleted')
  ALTER TABLE users ADD onboardingCompleted BIT NOT NULL DEFAULT 0;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'highestSATScore')
  ALTER TABLE users ADD highestSATScore INT NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'bluebookTestsTaken')
  ALTER TABLE users ADD bluebookTestsTaken INT NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'otherPrepApps')
  ALTER TABLE users ADD otherPrepApps NVARCHAR(MAX) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'strongCategories')
  ALTER TABLE users ADD strongCategories NVARCHAR(MAX) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'weakCategories')
  ALTER TABLE users ADD weakCategories NVARCHAR(MAX) NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'targetScore')
  ALTER TABLE users ADD targetScore INT NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('users') AND name = 'gradeLevel')
  ALTER TABLE users ADD gradeLevel NVARCHAR(1000) NULL;
