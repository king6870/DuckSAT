-- Comprehensive Analytics Tables
-- Tracks: survey answers, page views, drill analytics, user events, daily activity

-- Survey/Onboarding response tracking (per-question timing)
CREATE TABLE [dbo].[survey_responses] (
    [id] NVARCHAR(30) NOT NULL,
    [userId] NVARCHAR(191) NOT NULL,
    [surveyType] NVARCHAR(191) NOT NULL,
    [stepNumber] INT NOT NULL,
    [stepName] NVARCHAR(191) NOT NULL,
    [answer] NVARCHAR(MAX),
    [timeSpentMs] INT NOT NULL,
    [skipped] BIT NOT NULL CONSTRAINT [survey_responses_skipped_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [survey_responses_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [survey_responses_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE INDEX [survey_responses_userId_surveyType_idx] ON [dbo].[survey_responses]([userId], [surveyType]);
CREATE INDEX [survey_responses_surveyType_stepNumber_idx] ON [dbo].[survey_responses]([surveyType], [stepNumber]);

-- Page/Section time tracking
CREATE TABLE [dbo].[page_views] (
    [id] NVARCHAR(30) NOT NULL,
    [userId] NVARCHAR(191),
    [sessionId] NVARCHAR(191) NOT NULL,
    [pagePath] NVARCHAR(191) NOT NULL,
    [pageSection] NVARCHAR(191),
    [enteredAt] DATETIME2 NOT NULL,
    [dwellTimeMs] INT NOT NULL,
    [scrollDepthPct] INT,
    [referrer] NVARCHAR(191),
    [userAgent] NVARCHAR(500),
    [deviceType] NVARCHAR(50),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [page_views_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [page_views_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE INDEX [page_views_userId_pagePath_idx] ON [dbo].[page_views]([userId], [pagePath]);
CREATE INDEX [page_views_pagePath_createdAt_idx] ON [dbo].[page_views]([pagePath], [createdAt]);
CREATE INDEX [page_views_sessionId_idx] ON [dbo].[page_views]([sessionId]);

-- Drill/Practice session-level tracking
CREATE TABLE [dbo].[drill_attempts] (
    [id] NVARCHAR(30) NOT NULL,
    [userId] NVARCHAR(191) NOT NULL,
    [category] NVARCHAR(191) NOT NULL,
    [moduleType] NVARCHAR(191),
    [difficulty] NVARCHAR(191),
    [totalQuestions] INT NOT NULL,
    [correctAnswers] INT NOT NULL,
    [score] INT NOT NULL,
    [totalTimeMs] INT NOT NULL,
    [avgTimePerQ] INT NOT NULL,
    [fastestTimeMs] INT,
    [slowestTimeMs] INT,
    [streakCorrect] INT NOT NULL CONSTRAINT [drill_attempts_streakCorrect_df] DEFAULT 0,
    [streakWrong] INT NOT NULL CONSTRAINT [drill_attempts_streakWrong_df] DEFAULT 0,
    [startedAt] DATETIME2 NOT NULL,
    [completedAt] DATETIME2 NOT NULL,
    [abandoned] BIT NOT NULL CONSTRAINT [drill_attempts_abandoned_df] DEFAULT 0,
    [questionsLeft] INT NOT NULL CONSTRAINT [drill_attempts_questionsLeft_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [drill_attempts_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [drill_attempts_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE INDEX [drill_attempts_userId_category_idx] ON [dbo].[drill_attempts]([userId], [category]);
CREATE INDEX [drill_attempts_userId_createdAt_idx] ON [dbo].[drill_attempts]([userId], [createdAt]);
CREATE INDEX [drill_attempts_category_difficulty_idx] ON [dbo].[drill_attempts]([category], [difficulty]);

-- Per-question drill results
CREATE TABLE [dbo].[drill_question_results] (
    [id] NVARCHAR(30) NOT NULL,
    [drillAttemptId] NVARCHAR(30) NOT NULL,
    [questionId] NVARCHAR(191) NOT NULL,
    [questionIndex] INT NOT NULL,
    [category] NVARCHAR(191) NOT NULL,
    [difficulty] NVARCHAR(191) NOT NULL,
    [moduleType] NVARCHAR(191) NOT NULL,
    [userAnswer] INT NOT NULL,
    [correctAnswer] INT NOT NULL,
    [isCorrect] BIT NOT NULL,
    [timeSpentMs] INT NOT NULL,
    [changedAnswer] BIT NOT NULL CONSTRAINT [drill_question_results_changedAnswer_df] DEFAULT 0,
    [initialAnswer] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [drill_question_results_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [drill_question_results_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [drill_question_results_drillAttemptId_fkey] FOREIGN KEY ([drillAttemptId]) REFERENCES [dbo].[drill_attempts]([id]) ON DELETE CASCADE
);

CREATE INDEX [drill_question_results_drillAttemptId_idx] ON [dbo].[drill_question_results]([drillAttemptId]);
CREATE INDEX [drill_question_results_questionId_idx] ON [dbo].[drill_question_results]([questionId]);
CREATE INDEX [drill_question_results_category_difficulty_isCorrect_idx] ON [dbo].[drill_question_results]([category], [difficulty], [isCorrect]);

-- Generic user event tracking
CREATE TABLE [dbo].[user_events] (
    [id] NVARCHAR(30) NOT NULL,
    [userId] NVARCHAR(191),
    [sessionId] NVARCHAR(191),
    [eventType] NVARCHAR(191) NOT NULL,
    [eventName] NVARCHAR(191) NOT NULL,
    [metadata] NVARCHAR(MAX),
    [pagePath] NVARCHAR(191),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [user_events_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [user_events_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE INDEX [user_events_userId_eventType_idx] ON [dbo].[user_events]([userId], [eventType]);
CREATE INDEX [user_events_eventType_eventName_idx] ON [dbo].[user_events]([eventType], [eventName]);
CREATE INDEX [user_events_createdAt_idx] ON [dbo].[user_events]([createdAt]);

-- Daily aggregated activity per user
CREATE TABLE [dbo].[user_daily_activity] (
    [id] NVARCHAR(30) NOT NULL,
    [userId] NVARCHAR(191) NOT NULL,
    [date] DATE NOT NULL,
    [totalTimeMs] INT NOT NULL CONSTRAINT [user_daily_activity_totalTimeMs_df] DEFAULT 0,
    [questionsAnswered] INT NOT NULL CONSTRAINT [user_daily_activity_questionsAnswered_df] DEFAULT 0,
    [questionsCorrect] INT NOT NULL CONSTRAINT [user_daily_activity_questionsCorrect_df] DEFAULT 0,
    [drillsCompleted] INT NOT NULL CONSTRAINT [user_daily_activity_drillsCompleted_df] DEFAULT 0,
    [testsCompleted] INT NOT NULL CONSTRAINT [user_daily_activity_testsCompleted_df] DEFAULT 0,
    [pagesVisited] INT NOT NULL CONSTRAINT [user_daily_activity_pagesVisited_df] DEFAULT 0,
    [loginCount] INT NOT NULL CONSTRAINT [user_daily_activity_loginCount_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [user_daily_activity_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [user_daily_activity_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [user_daily_activity_userId_date_key] UNIQUE ([userId], [date])
);

CREATE INDEX [user_daily_activity_userId_date_idx] ON [dbo].[user_daily_activity]([userId], [date]);
