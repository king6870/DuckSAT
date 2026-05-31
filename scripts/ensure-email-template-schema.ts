import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function ensureEmailTemplateSchema() {
  const statements = [
    {
      name: 'inbound_emails table',
      sql: `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'inbound_emails' AND type = 'U')
BEGIN
  CREATE TABLE [dbo].[inbound_emails] (
    [id] NVARCHAR(1000) NOT NULL,
    [resendEmailId] NVARCHAR(1000) NOT NULL,
    [messageId] NVARCHAR(1000) NULL,
    [fromEmail] NVARCHAR(1000) NOT NULL,
    [toEmails] NVARCHAR(MAX) NOT NULL,
    [ccEmails] NVARCHAR(MAX) NULL,
    [bccEmails] NVARCHAR(MAX) NULL,
    [replyToEmails] NVARCHAR(MAX) NULL,
    [subject] NVARCHAR(1000) NULL,
    [textBody] NVARCHAR(MAX) NULL,
    [htmlBody] NVARCHAR(MAX) NULL,
    [headersJson] NVARCHAR(MAX) NULL,
    [attachmentsJson] NVARCHAR(MAX) NULL,
    [attachmentCount] INT NOT NULL CONSTRAINT [inbound_emails_attachmentCount_df] DEFAULT 0,
    [receivedAt] DATETIME2 NOT NULL,
    [forwardStatus] NVARCHAR(1000) NOT NULL CONSTRAINT [inbound_emails_forwardStatus_df] DEFAULT N'pending',
    [forwardTarget] NVARCHAR(1000) NULL,
    [forwardedResendId] NVARCHAR(1000) NULL,
    [forwardedAt] DATETIME2 NULL,
    [forwardError] NVARCHAR(MAX) NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [inbound_emails_createdAt_df] DEFAULT GETDATE(),
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [inbound_emails_pkey] PRIMARY KEY ([id]),
    CONSTRAINT [inbound_emails_resendEmailId_key] UNIQUE ([resendEmailId])
  );
END
`,
    },
    {
      name: 'inbound_emails receivedAt index',
      sql: `
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID(N'[dbo].[inbound_emails]')
    AND name = N'inbound_emails_receivedAt_idx'
)
BEGIN
  CREATE INDEX [inbound_emails_receivedAt_idx] ON [dbo].[inbound_emails] ([receivedAt]);
END
`,
    },
    {
      name: 'inbound_emails forwardStatus/receivedAt index',
      sql: `
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID(N'[dbo].[inbound_emails]')
    AND name = N'inbound_emails_forwardStatus_receivedAt_idx'
)
BEGIN
  CREATE INDEX [inbound_emails_forwardStatus_receivedAt_idx] ON [dbo].[inbound_emails] ([forwardStatus], [receivedAt]);
END
`,
    },
    {
      name: 'promo_codes table',
      sql: `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'promo_codes' AND type = 'U')
BEGIN
  CREATE TABLE [dbo].[promo_codes] (
    [id] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [label] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(MAX) NOT NULL,
    [effectType] NVARCHAR(1000) NOT NULL,
    [bonusPracticeTests] INT NULL,
    [successMessage] NVARCHAR(MAX) NOT NULL,
    [emailSelectable] BIT NOT NULL CONSTRAINT [promo_codes_emailSelectable_df] DEFAULT 0,
    [isActive] BIT NOT NULL CONSTRAINT [promo_codes_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [promo_codes_createdAt_df] DEFAULT GETDATE(),
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [promo_codes_pkey] PRIMARY KEY ([id]),
    CONSTRAINT [promo_codes_code_key] UNIQUE ([code])
  );
END
`,
    },
    {
      name: 'promo_codes isActive/emailSelectable index',
      sql: `
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID(N'[dbo].[promo_codes]')
    AND name = N'promo_codes_isActive_emailSelectable_idx'
)
BEGIN
  CREATE INDEX [promo_codes_isActive_emailSelectable_idx] ON [dbo].[promo_codes] ([isActive], [emailSelectable]);
END
`,
    },
    {
      name: 'email_templates table',
      sql: `
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'email_templates' AND type = 'U')
BEGIN
  CREATE TABLE [dbo].[email_templates] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(MAX),
    [aiPrompt] NVARCHAR(MAX),
    [promoCode] NVARCHAR(1000),
    [subjectTemplate] NVARCHAR(1000) NOT NULL,
    [previewText] NVARCHAR(1000),
    [eyebrow] NVARCHAR(1000),
    [headline] NVARCHAR(1000),
    [bodyTemplate] NVARCHAR(MAX) NOT NULL,
    [primaryButtonLabel] NVARCHAR(1000),
    [primaryButtonUrl] NVARCHAR(1000),
    [secondaryButtonLabel] NVARCHAR(1000),
    [secondaryButtonUrl] NVARCHAR(1000),
    [footer] NVARCHAR(MAX),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [email_templates_createdAt_df] DEFAULT GETDATE(),
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [email_templates_pkey] PRIMARY KEY ([id])
  );
END
`,
    },
    {
      name: 'email_templates.promoCode column',
      sql: `
IF COL_LENGTH('email_templates', 'promoCode') IS NULL
BEGIN
  ALTER TABLE [dbo].[email_templates] ADD [promoCode] NVARCHAR(1000) NULL;
END
`,
    },
    {
      name: 'email_templates updatedAt index',
      sql: `
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID(N'[dbo].[email_templates]')
    AND name = N'email_templates_updatedAt_idx'
)
BEGIN
  CREATE INDEX [email_templates_updatedAt_idx] ON [dbo].[email_templates] ([updatedAt]);
END
`,
    },
    {
      name: 'email_automations.promoCode column',
      sql: `
IF COL_LENGTH('email_automations', 'promoCode') IS NULL
BEGIN
  ALTER TABLE [dbo].[email_automations] ADD [promoCode] NVARCHAR(1000) NULL;
END
`,
    },
    {
      name: 'email_automations.templateId column',
      sql: `
IF COL_LENGTH('email_automations', 'templateId') IS NULL
BEGIN
  ALTER TABLE [dbo].[email_automations] ADD [templateId] NVARCHAR(1000) NULL;
END
`,
    },
    {
      name: 'email_automations.templateId index',
      sql: `
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID(N'[dbo].[email_automations]')
    AND name = N'email_automations_templateId_idx'
)
BEGIN
  CREATE INDEX [email_automations_templateId_idx] ON [dbo].[email_automations] ([templateId]);
END
`,
    },
    {
      name: 'email_automations.templateId foreign key',
      sql: `
IF NOT EXISTS (
  SELECT 1 FROM sys.foreign_keys
  WHERE name = N'email_automations_templateId_fkey'
    AND parent_object_id = OBJECT_ID(N'[dbo].[email_automations]')
)
BEGIN
  ALTER TABLE [dbo].[email_automations]
    ADD CONSTRAINT [email_automations_templateId_fkey]
    FOREIGN KEY ([templateId]) REFERENCES [dbo].[email_templates]([id]) ON DELETE SET NULL;
END
`,
    },
    {
      name: 'users.satTestDate column',
      sql: `
IF COL_LENGTH('users', 'satTestDate') IS NULL
BEGIN
  ALTER TABLE [dbo].[users] ADD [satTestDate] DATETIME2 NULL;
END
`,
    },
  ]

  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement.sql)
      console.log(`Ensured: ${statement.name}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`Failed ensuring ${statement.name}: ${message}`)
      throw error
    }
  }
}

async function main() {
  await ensureEmailTemplateSchema()
  console.log('Email and inbound mail schema check complete.')
}

main()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })