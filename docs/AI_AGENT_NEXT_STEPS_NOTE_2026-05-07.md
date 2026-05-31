# AI Agent Next Steps Note (2026-05-07)

## Implemented In This Slice

1. Added persistent admin policy storage model:
   - Prisma model: AIAgentPolicy
   - SQL migration updates in prisma/migrations/20260506120000_add_ai_agent_tables/migration.sql

2. Added admin policy API:
   - GET /api/admin/ai-agent/policy
   - POST /api/admin/ai-agent/policy

3. Added admin metrics API:
   - GET /api/admin/ai-agent/metrics?days=30

4. Wired runtime policy application to tutoring:
   - Session creation now snapshots the active admin policy when available
   - Message generation uses session policy snapshot first, then active policy fallback

## Policy API Contract

### POST /api/admin/ai-agent/policy

Request JSON:

{
  "policyName": "default-topic-drill-policy",
  "policyVersion": "1.1.0",
  "longMessageThreshold": 260,
  "qualitySignals": [
    "step by step",
    "full explanation",
    "strategy",
    "derive"
  ],
  "notes": "Slightly more aggressive quality escalation.",
  "isActive": true
}

Behavior:
- Requires admin session (email allowlist).
- When isActive=true, previous active policies are deactivated.
- Returns created policy record.

### GET /api/admin/ai-agent/policy

Returns:
- activePolicy
- policies (most recent 50)

## Metrics API Contract

### GET /api/admin/ai-agent/metrics?days=30

Returns:
- summary: request volume, success rate, latency, token usage, estimated cost
- activePolicy: currently active policy values
- byTier: budget vs quality aggregates
- topModels: top model usage rows
- escalationReasons: most frequent escalation reasons

## Operational Notes

1. Apply DB migration before using admin AI-agent endpoints:
   - prisma/migrations/20260506120000_add_ai_agent_tables/migration.sql

2. Existing Topic Drill tutor path remains backward-compatible:
   - If AI-agent tables are unavailable, client falls back to legacy /api/ai-tutor/chat.

3. Cost estimates depend on optional env rates:
   - AI_TUTOR_QUALITY_INPUT_COST_PER_1K
   - AI_TUTOR_QUALITY_OUTPUT_COST_PER_1K
   - AI_TUTOR_BUDGET_INPUT_COST_PER_1K
   - AI_TUTOR_BUDGET_OUTPUT_COST_PER_1K

## Suggested Immediate Follow-up

1. Add admin page panel under /admin/data to visualize /api/admin/ai-agent/metrics.
2. Add API tests for policy endpoint validation and admin auth behavior.
3. Add dashboard alert threshold for high cost/day and high refusal rate.
