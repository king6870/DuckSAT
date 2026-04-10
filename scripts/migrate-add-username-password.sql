-- Idempotent migration: add username + passwordHash to users table
-- Safe to run multiple times — checks existence before altering

-- Add username column (nullable)
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'username'
)
BEGIN
  ALTER TABLE users ADD username NVARCHAR(20) NULL;
END;

-- Add filtered unique index on username (dynamic SQL avoids compile-time column resolution)
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'UQ_users_username' AND object_id = OBJECT_ID('users')
)
BEGIN
  EXEC('CREATE UNIQUE INDEX UQ_users_username ON users(username) WHERE username IS NOT NULL');
END;

-- Add passwordHash column (nullable)
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'passwordHash'
)
BEGIN
  ALTER TABLE users ADD passwordHash NVARCHAR(255) NULL;
END;
