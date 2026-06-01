-- CreateTable: ai_agent_sessions
CREATE TABLE "ai_agent_sessions" (
    "id" NVARCHAR(1000) NOT NULL,
    "userId" NVARCHAR(1000) NOT NULL,
    "status" NVARCHAR(1000) NOT NULL CONSTRAINT "ai_agent_sessions_status_df" DEFAULT 'active',
    "source" NVARCHAR(1000),
    "moduleType" NVARCHAR(1000),
    "category" NVARCHAR(1000),
    "difficulty" NVARCHAR(1000),
    "policyName" NVARCHAR(1000),
    "policyVersion" NVARCHAR(1000),
    "metadata" NVARCHAR(MAX),
    "startedAt" DATETIME2 NOT NULL CONSTRAINT "ai_agent_sessions_startedAt_df" DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME2,
    "createdAt" DATETIME2 NOT NULL CONSTRAINT "ai_agent_sessions_createdAt_df" DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME2 NOT NULL,

    CONSTRAINT "ai_agent_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ai_agent_messages
CREATE TABLE "ai_agent_messages" (
    "id" NVARCHAR(1000) NOT NULL,
    "sessionId" NVARCHAR(1000) NOT NULL,
    "userId" NVARCHAR(1000) NOT NULL,
    "role" NVARCHAR(1000) NOT NULL,
    "content" NVARCHAR(MAX) NOT NULL,
    "questionContext" NVARCHAR(MAX),
    "modelTier" NVARCHAR(1000),
    "modelUsed" NVARCHAR(1000),
    "latencyMs" INT,
    "promptTokens" INT,
    "completionTokens" INT,
    "totalTokens" INT,
    "estimatedCostUsd" FLOAT,
    "refusalDetected" BIT NOT NULL CONSTRAINT "ai_agent_messages_refusalDetected_df" DEFAULT 0,
    "answerBlocked" BIT NOT NULL CONSTRAINT "ai_agent_messages_answerBlocked_df" DEFAULT 0,
    "feedbackValue" INT,
    "createdAt" DATETIME2 NOT NULL CONSTRAINT "ai_agent_messages_createdAt_df" DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_agent_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ai_agent_tool_calls
CREATE TABLE "ai_agent_tool_calls" (
    "id" NVARCHAR(1000) NOT NULL,
    "sessionId" NVARCHAR(1000) NOT NULL,
    "userId" NVARCHAR(1000) NOT NULL,
    "toolName" NVARCHAR(1000) NOT NULL,
    "toolInput" NVARCHAR(MAX),
    "toolOutput" NVARCHAR(MAX),
    "success" BIT NOT NULL CONSTRAINT "ai_agent_tool_calls_success_df" DEFAULT 1,
    "latencyMs" INT,
    "createdAt" DATETIME2 NOT NULL CONSTRAINT "ai_agent_tool_calls_createdAt_df" DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_agent_tool_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ai_agent_usage_metrics
CREATE TABLE "ai_agent_usage_metrics" (
    "id" NVARCHAR(1000) NOT NULL,
    "sessionId" NVARCHAR(1000) NOT NULL,
    "userId" NVARCHAR(1000) NOT NULL,
    "modelTier" NVARCHAR(1000) NOT NULL,
    "modelUsed" NVARCHAR(1000) NOT NULL,
    "latencyMs" INT NOT NULL,
    "promptTokens" INT,
    "completionTokens" INT,
    "totalTokens" INT,
    "estimatedCostUsd" FLOAT,
    "requestSucceeded" BIT NOT NULL CONSTRAINT "ai_agent_usage_metrics_requestSucceeded_df" DEFAULT 1,
    "errorCode" NVARCHAR(1000),
    "createdAt" DATETIME2 NOT NULL CONSTRAINT "ai_agent_usage_metrics_createdAt_df" DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_agent_usage_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ai_agent_policies
CREATE TABLE "ai_agent_policies" (
    "id" NVARCHAR(1000) NOT NULL,
    "policyName" NVARCHAR(1000) NOT NULL,
    "policyVersion" NVARCHAR(1000) NOT NULL,
    "longMessageThreshold" INT NOT NULL CONSTRAINT "ai_agent_policies_longMessageThreshold_df" DEFAULT 280,
    "qualitySignals" NVARCHAR(MAX) NOT NULL,
    "isActive" BIT NOT NULL CONSTRAINT "ai_agent_policies_isActive_df" DEFAULT 1,
    "notes" NVARCHAR(MAX),
    "updatedByUserId" NVARCHAR(1000),
    "createdAt" DATETIME2 NOT NULL CONSTRAINT "ai_agent_policies_createdAt_df" DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME2 NOT NULL,

    CONSTRAINT "ai_agent_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ai_agent_policy_snapshots
CREATE TABLE "ai_agent_policy_snapshots" (
    "id" NVARCHAR(1000) NOT NULL,
    "sessionId" NVARCHAR(1000) NOT NULL,
    "userId" NVARCHAR(1000) NOT NULL,
    "policyName" NVARCHAR(1000) NOT NULL,
    "policyVersion" NVARCHAR(1000) NOT NULL,
    "configJson" NVARCHAR(MAX) NOT NULL,
    "createdAt" DATETIME2 NOT NULL CONSTRAINT "ai_agent_policy_snapshots_createdAt_df" DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_agent_policy_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ai_agent_escalation_events
CREATE TABLE "ai_agent_escalation_events" (
    "id" NVARCHAR(1000) NOT NULL,
    "sessionId" NVARCHAR(1000) NOT NULL,
    "userId" NVARCHAR(1000) NOT NULL,
    "fromTier" NVARCHAR(1000) NOT NULL,
    "toTier" NVARCHAR(1000) NOT NULL,
    "reason" NVARCHAR(1000) NOT NULL,
    "details" NVARCHAR(MAX),
    "createdAt" DATETIME2 NOT NULL CONSTRAINT "ai_agent_escalation_events_createdAt_df" DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_agent_escalation_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: ai_agent_sessions
CREATE INDEX "ai_agent_sessions_userId_createdAt_idx" ON "ai_agent_sessions"("userId", "createdAt");
CREATE INDEX "ai_agent_sessions_status_createdAt_idx" ON "ai_agent_sessions"("status", "createdAt");

-- CreateIndex: ai_agent_messages
CREATE INDEX "ai_agent_messages_sessionId_createdAt_idx" ON "ai_agent_messages"("sessionId", "createdAt");
CREATE INDEX "ai_agent_messages_userId_createdAt_idx" ON "ai_agent_messages"("userId", "createdAt");
CREATE INDEX "ai_agent_messages_modelTier_createdAt_idx" ON "ai_agent_messages"("modelTier", "createdAt");

-- CreateIndex: ai_agent_tool_calls
CREATE INDEX "ai_agent_tool_calls_sessionId_createdAt_idx" ON "ai_agent_tool_calls"("sessionId", "createdAt");
CREATE INDEX "ai_agent_tool_calls_toolName_createdAt_idx" ON "ai_agent_tool_calls"("toolName", "createdAt");

-- CreateIndex: ai_agent_usage_metrics
CREATE INDEX "ai_agent_usage_metrics_sessionId_createdAt_idx" ON "ai_agent_usage_metrics"("sessionId", "createdAt");
CREATE INDEX "ai_agent_usage_metrics_userId_createdAt_idx" ON "ai_agent_usage_metrics"("userId", "createdAt");
CREATE INDEX "ai_agent_usage_metrics_modelTier_createdAt_idx" ON "ai_agent_usage_metrics"("modelTier", "createdAt");

-- CreateIndex: ai_agent_policies
CREATE INDEX "ai_agent_policies_isActive_updatedAt_idx" ON "ai_agent_policies"("isActive", "updatedAt");
CREATE INDEX "ai_agent_policies_policyName_policyVersion_idx" ON "ai_agent_policies"("policyName", "policyVersion");

-- CreateIndex: ai_agent_policy_snapshots
CREATE INDEX "ai_agent_policy_snapshots_sessionId_createdAt_idx" ON "ai_agent_policy_snapshots"("sessionId", "createdAt");
CREATE INDEX "ai_agent_policy_snapshots_policyName_policyVersion_idx" ON "ai_agent_policy_snapshots"("policyName", "policyVersion");

-- CreateIndex: ai_agent_escalation_events
CREATE INDEX "ai_agent_escalation_events_sessionId_createdAt_idx" ON "ai_agent_escalation_events"("sessionId", "createdAt");
CREATE INDEX "ai_agent_escalation_events_fromTier_toTier_createdAt_idx" ON "ai_agent_escalation_events"("fromTier", "toTier", "createdAt");

-- AddForeignKey: ai_agent_sessions
ALTER TABLE "ai_agent_sessions" ADD CONSTRAINT "ai_agent_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: ai_agent_messages
ALTER TABLE "ai_agent_messages" ADD CONSTRAINT "ai_agent_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ai_agent_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_agent_messages" ADD CONSTRAINT "ai_agent_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey: ai_agent_tool_calls
ALTER TABLE "ai_agent_tool_calls" ADD CONSTRAINT "ai_agent_tool_calls_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ai_agent_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_agent_tool_calls" ADD CONSTRAINT "ai_agent_tool_calls_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey: ai_agent_usage_metrics
ALTER TABLE "ai_agent_usage_metrics" ADD CONSTRAINT "ai_agent_usage_metrics_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ai_agent_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_agent_usage_metrics" ADD CONSTRAINT "ai_agent_usage_metrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey: ai_agent_policies
ALTER TABLE "ai_agent_policies" ADD CONSTRAINT "ai_agent_policies_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey: ai_agent_policy_snapshots
ALTER TABLE "ai_agent_policy_snapshots" ADD CONSTRAINT "ai_agent_policy_snapshots_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ai_agent_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_agent_policy_snapshots" ADD CONSTRAINT "ai_agent_policy_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey: ai_agent_escalation_events
ALTER TABLE "ai_agent_escalation_events" ADD CONSTRAINT "ai_agent_escalation_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ai_agent_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_agent_escalation_events" ADD CONSTRAINT "ai_agent_escalation_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
