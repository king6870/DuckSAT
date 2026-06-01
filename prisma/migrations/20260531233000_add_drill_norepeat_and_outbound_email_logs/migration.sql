-- Add drill no-repeat tracking tables
CREATE TABLE [drill_scope_states] (
  [id] NVARCHAR(1000) NOT NULL,
  [userId] NVARCHAR(1000) NOT NULL,
  [scopeKey] NVARCHAR(1000) NOT NULL,
  [cycleNumber] INT NOT NULL CONSTRAINT [drill_scope_states_cycleNumber_df] DEFAULT 1,
  [lastCompletedCycleAt] DATETIME2,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [drill_scope_states_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  [updatedAt] DATETIME2 NOT NULL,
  CONSTRAINT [drill_scope_states_pkey] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [drill_scope_states_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [users]([id]) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE NONCLUSTERED INDEX [drill_scope_states_userId_scopeKey_key]
  ON [drill_scope_states]([userId], [scopeKey]);

CREATE NONCLUSTERED INDEX [drill_scope_states_userId_scopeKey_cycleNumber_idx]
  ON [drill_scope_states]([userId], [scopeKey], [cycleNumber]);

CREATE TABLE [drill_question_exposures] (
  [id] NVARCHAR(1000) NOT NULL,
  [userId] NVARCHAR(1000) NOT NULL,
  [questionId] NVARCHAR(1000) NOT NULL,
  [scopeKey] NVARCHAR(1000) NOT NULL,
  [cycleNumber] INT NOT NULL,
  [source] NVARCHAR(1000) NOT NULL CONSTRAINT [drill_question_exposures_source_df] DEFAULT 'drill',
  [drillAttemptId] NVARCHAR(1000),
  [seenAt] DATETIME2 NOT NULL CONSTRAINT [drill_question_exposures_seenAt_df] DEFAULT CURRENT_TIMESTAMP,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [drill_question_exposures_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [drill_question_exposures_pkey] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [drill_question_exposures_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [users]([id]) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT [drill_question_exposures_questionId_fkey] FOREIGN KEY ([questionId]) REFERENCES [questions]([id]) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE NONCLUSTERED INDEX [drill_question_exposures_userId_questionId_scopeKey_cycleNumber_key]
  ON [drill_question_exposures]([userId], [questionId], [scopeKey], [cycleNumber]);

CREATE NONCLUSTERED INDEX [drill_question_exposures_userId_scopeKey_cycleNumber_idx]
  ON [drill_question_exposures]([userId], [scopeKey], [cycleNumber]);

CREATE NONCLUSTERED INDEX [drill_question_exposures_questionId_idx]
  ON [drill_question_exposures]([questionId]);

-- Add unified outbound email log table
CREATE TABLE [outbound_email_messages] (
  [id] NVARCHAR(1000) NOT NULL,
  [userId] NVARCHAR(1000),
  [toEmail] NVARCHAR(1000) NOT NULL,
  [fromEmail] NVARCHAR(1000),
  [replyToEmail] NVARCHAR(1000),
  [channel] NVARCHAR(1000) NOT NULL,
  [templateId] NVARCHAR(1000),
  [automationId] NVARCHAR(1000),
  [triggerType] NVARCHAR(1000),
  [triggerKey] NVARCHAR(1000),
  [subject] NVARCHAR(1000) NOT NULL,
  [htmlBody] NVARCHAR(MAX) NOT NULL,
  [textBody] NVARCHAR(MAX) NOT NULL,
  [provider] NVARCHAR(1000) NOT NULL CONSTRAINT [outbound_email_messages_provider_df] DEFAULT 'resend',
  [providerMessageId] NVARCHAR(1000),
  [status] NVARCHAR(1000) NOT NULL CONSTRAINT [outbound_email_messages_status_df] DEFAULT 'queued',
  [error] NVARCHAR(MAX),
  [metadata] NVARCHAR(MAX),
  [sentAt] DATETIME2,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [outbound_email_messages_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  [updatedAt] DATETIME2 NOT NULL,
  CONSTRAINT [outbound_email_messages_pkey] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [outbound_email_messages_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [users]([id]) ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT [outbound_email_messages_templateId_fkey] FOREIGN KEY ([templateId]) REFERENCES [email_templates]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT [outbound_email_messages_automationId_fkey] FOREIGN KEY ([automationId]) REFERENCES [email_automations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE NONCLUSTERED INDEX [outbound_email_messages_userId_createdAt_idx]
  ON [outbound_email_messages]([userId], [createdAt]);

CREATE NONCLUSTERED INDEX [outbound_email_messages_status_createdAt_idx]
  ON [outbound_email_messages]([status], [createdAt]);

CREATE NONCLUSTERED INDEX [outbound_email_messages_automationId_createdAt_idx]
  ON [outbound_email_messages]([automationId], [createdAt]);
