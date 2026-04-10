-- Create click_events table for behavior heatmap tracking
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'click_events')
BEGIN
  CREATE TABLE [dbo].[click_events] (
    [id]        NVARCHAR(1000) NOT NULL,
    [userId]    NVARCHAR(1000) NULL,
    [sessionId] NVARCHAR(1000) NULL,
    [pagePath]  NVARCHAR(1000) NOT NULL,
    [xPct]      FLOAT NOT NULL,
    [yPct]      FLOAT NOT NULL,
    [element]   NVARCHAR(1000) NULL,
    [label]     NVARCHAR(1000) NULL,
    [eventType] NVARCHAR(1000) NOT NULL DEFAULT 'click',
    [createdAt] DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT [click_events_pkey] PRIMARY KEY ([id])
  );
  CREATE INDEX [click_events_pagePath_createdAt_idx] ON [dbo].[click_events] ([pagePath], [createdAt]);
  CREATE INDEX [click_events_userId_idx] ON [dbo].[click_events] ([userId]);
END
