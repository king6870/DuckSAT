# Deployment Guide: Epic #34 - Diverse Question Types & Practice Test Integration

**Version**: 1.0  
**Date**: 2026-02-17  
**Status**: Ready for Staging Deployment

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Database Migration](#database-migration)
4. [Prisma Schema Update](#prisma-schema-update)
5. [API Deployment](#api-deployment)
6. [Testing & Verification](#testing--verification)
7. [Rollback Procedure](#rollback-procedure)
8. [Post-Deployment Monitoring](#post-deployment-monitoring)

---

## Overview

This deployment adds support for diverse question types (8+ visual types) and a new Practice Test API endpoint for adaptive question filtering.

**Key Changes:**
- ✅ Database schema: Add `visualType` and `difficultyScore` columns
- ✅ Prisma schema: Update Question model
- ✅ New API endpoint: `GET/POST /api/questions/practice`
- ✅ Unit tests: 31 tests (72% coverage)
- ✅ Integration tests: 24 API tests
- ✅ Security fix: eval() replaced with sympy

**Epic**: #34  
**Features**: #35, #36, #37, #38  
**Stories**: #42, #43, #44

---

## Pre-Deployment Checklist

### Prerequisites

- [ ] All unit tests passing (31/31)
- [ ] All integration tests passing
- [ ] Code review approved
- [ ] Database backup completed
- [ ] Staging environment ready
- [ ] Azure SQL Server access confirmed

### Environment Variables

Ensure these are set in production environment:

```env
DATABASE_URL="sqlserver://db-ducksat.database.windows.net:1433;database=DuckSAT_DB;user=lionvihaan;password=<REDACTED>;encrypt=true;trustServerCertificate=false;loginTimeout=60"
AZURE_OPENAI_ENDPOINT="https://ducksat.openai.azure.com/"
AZURE_OPENAI_API_KEY="<REDACTED>"
AZURE_OPENAI_DEPLOYMENT_NAME="gpt-5-nano"
```

### Dependencies Installed

```bash
# Python (for V3 generator)
pip install sympy==1.14.0
pip install pytest==7.4.3 pytest-cov==4.1.0

# Node.js (for API)
npm install zod  # Should already be installed
```

---

## Database Migration

### Step 1: Backup Database

**Staging:**
```bash
az sql db export \
  --resource-group DuckSAT-RG \
  --server db-ducksat-staging \
  --database DuckSAT_DB_Staging \
  --admin-user lionvihaan \
  --admin-password <PASSWORD> \
  --storage-key <STORAGE_KEY> \
  --storage-key-type StorageAccessKey \
  --storage-uri https://ducksatbackup.blob.core.windows.net/backups/staging-pre-migration-$(date +%Y%m%d-%H%M%S).bacpac
```

**Production** (when ready):
```bash
az sql db export \
  --resource-group DuckSAT-RG \
  --server db-ducksat \
  --database DuckSAT_DB \
  --admin-user lionvihaan \
  --admin-password <PASSWORD> \
  --storage-key <STORAGE_KEY> \
  --storage-key-type StorageAccessKey \
  --storage-uri https://ducksatbackup.blob.core.windows.net/backups/prod-pre-migration-$(date +%Y%m%d-%H%M%S).bacpac
```

### Step 2: Execute Migration on Staging

**Windows (PowerShell):**
```powershell
sqlcmd -S db-ducksat-staging.database.windows.net `
  -d DuckSAT_DB_Staging `
  -U lionvihaan `
  -P Microsoft757 `
  -i prisma/migrations/001_add_visual_metadata_fields.sql `
  -o migration_output_staging.txt
```

**Linux/Mac:**
```bash
sqlcmd -S db-ducksat-staging.database.windows.net \
  -d DuckSAT_DB_Staging \
  -U lionvihaan \
  -P Microsoft757 \
  -i prisma/migrations/001_add_visual_metadata_fields.sql \
  -o migration_output_staging.txt
```

### Step 3: Verify Staging Migration

**SQL Verification Queries:**
```sql
-- 1. Check new columns exist
SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'questions' 
  AND COLUMN_NAME IN ('visualType', 'difficultyScore');

-- Expected output:
-- visualType | YES | nvarchar | 50
-- difficultyScore | YES | int | NULL

-- 2. Check indexes created
SELECT i.name AS IndexName, i.type_desc AS IndexType, COL_NAME(ic.object_id, ic.column_id) AS ColumnName
FROM sys.indexes AS i
INNER JOIN sys.index_columns AS ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
WHERE i.object_id = OBJECT_ID('questions')
  AND i.name LIKE 'idx_questions_%';

-- Expected indexes:
-- idx_questions_visual_type
-- idx_questions_practice_filters

-- 3. Check backfill statistics
SELECT 
  visualType,
  COUNT(*) AS QuestionCount,
  AVG(CAST(difficultyScore AS FLOAT)) AS AvgDifficultyScore
FROM questions
WHERE isActive = 1
GROUP BY visualType
ORDER BY QuestionCount DESC;

-- Expected: Most questions have visualType='geometry' or 'none'

-- 4. Check for NULL values
SELECT 
  COUNT(*) AS TotalQuestions,
  SUM(CASE WHEN visualType IS NULL THEN 1 ELSE 0 END) AS NullVisualType,
  SUM(CASE WHEN difficultyScore IS NULL THEN 1 ELSE 0 END) AS NullDifficultyScore
FROM questions;

-- Expected: NullVisualType and NullDifficultyScore should be 0 or minimal
```

### Step 4: Execute Migration on Production

**⚠️ Only after successful staging verification!**

```powershell
sqlcmd -S db-ducksat.database.windows.net `
  -d DuckSAT_DB `
  -U lionvihaan `
  -P Microsoft757 `
  -i prisma/migrations/001_add_visual_metadata_fields.sql `
  -o migration_output_production.txt
```

---

## Prisma Schema Update

### Step 1: Verify Schema Changes

Check that `prisma/schema.prisma` includes:

```prisma
model Question {
  // ... existing fields ...
  visualType   String?  // V3 Generator: 'bar-chart' | 'line-graph' | 'scatter-plot' | ...
  difficultyScore Int?  // Numeric difficulty (easy=25, medium=50, hard=75)
  // ... rest of fields ...
}
```

### Step 2: Pull Schema from Database

Run on staging first:

```bash
# Staging
export DATABASE_URL="sqlserver://db-ducksat-staging.database.windows.net:1433;database=DuckSAT_DB_Staging;user=lionvihaan;password=Microsoft757;encrypt=true"

npx prisma db pull
npx prisma generate
```

### Step 3: Verify TypeScript Types

Check that TypeScript types are generated:

```typescript
// In Node REPL or test file:
import { Question } from '@prisma/client';

// Should have:
// visualType?: string | null
// difficultyScore?: number | null
```

### Step 4: Deploy to Production

After staging verification:

```bash
# Production
export DATABASE_URL="sqlserver://db-ducksat.database.windows.net:1433;database=DuckSAT_DB;user=lionvihaan;password=<PASSWORD>;encrypt=true"

npx prisma db pull
npx prisma generate
```

---

## API Deployment

### Step 1: Deploy Code

**Option A: Vercel** (if hosting on Vercel):
```bash
# Commit changes
git add .
git commit -m "feat: add Practice Test API and V3 generator support (#34)"
git push origin main

# Vercel auto-deploys on push to main
```

**Option B: Manual Deployment**:
```bash
# Build Next.js app
npm run build

# Deploy build folder to hosting service
# (specific commands depend on hosting provider)
```

### Step 2: Verify API Endpoint

**Test GET endpoint:**
```bash
curl "https://ducksat.com/api/questions/practice?moduleType=math&count=5"

# Expected response:
# {
#   "success": true,
#   "data": {
#     "questions": [ ... ],
#     "count": 5,
#     "totalAvailable": 150,
#     "hasMore": true,
#     "filters": { ... }
#   },
#   "meta": { ... }
# }
```

**Test POST endpoint:**
```bash
curl -X POST "https://ducksat.com/api/questions/practice" \
  -H "Content-Type: application/json" \
  -d '{
    "moduleType": "math",
    "count": 10,
    "distribution": { "easy": 40, "medium": 40, "hard": 20 }
  }'

# Expected response:
# {
#   "success": true,
#   "data": {
#     "questions": [ ... ],
#     "count": 10,
#     "distribution": { "easy": 4, "medium": 4, "hard": 2 }
#   },
#   "meta": { ... }
# }
```

---

## Testing & Verification

### Unit Tests

```bash
cd azuredev-038d-main
python -m pytest tests/ -v --cov=generators --cov-report=html

# Expected: 31 passed, 72% coverage
```

### Integration Tests

```bash
cd DuckSAT
npm test tests/api/questions-practice.test.ts

# Expected: 24 tests passing
```

### Manual Testing Checklist

**GET /api/questions/practice:**
- [ ] Returns questions for `moduleType=math`
- [ ] Returns questions for `moduleType=reading-writing`
- [ ] Filters by `visualType=geometry`
- [ ] Filters by `visualType=bar-chart` (V3 questions)
- [ ] Filters by `difficulty=easy`
- [ ] Filters by numeric range `difficultyMin=25&difficultyMax=50`
- [ ] Filters by `category=algebra`
- [ ] Filters by `subtopic=linear-equations`
- [ ] Excludes questions via `excludeIds=id1,id2,id3`
- [ ] Returns explanations when `includeExplanations=true`
- [ ] Respects `count` limit (max 50)
- [ ] Returns `totalAvailable` count
- [ ] Returns `hasMore` boolean

**POST /api/questions/practice:**
- [ ] Generates practice test with default distribution (33/34/33)
- [ ] Generates practice test with custom distribution
- [ ] Filters by `visualTypes` array
- [ ] Excludes questions via `excludeIds` array
- [ ] Randomizes order when `randomize=true`
- [ ] Returns correct distribution counts

**Performance:**
- [ ] GET requests complete in <500ms
- [ ] POST requests complete in <1000ms

---

## Rollback Procedure

### If Migration Fails

**1. Stop application deployment immediately**

**2. Roll back database changes:**

```sql
-- Connect to affected database
DROP INDEX IF EXISTS idx_questions_visual_type ON questions;
DROP INDEX IF EXISTS idx_questions_practice_filters ON questions;

ALTER TABLE questions DROP COLUMN IF EXISTS visualType;
ALTER TABLE questions DROP COLUMN IF EXISTS difficultyScore;
```

**3. Restore from backup:**

```bash
az sql db import \
  --resource-group DuckSAT-RG \
  --server db-ducksat \
  --database DuckSAT_DB \
  --admin-user lionvihaan \
  --admin-password <PASSWORD> \
  --storage-key <STORAGE_KEY> \
  --storage-key-type StorageAccessKey \
  --storage-uri https://ducksatbackup.blob.core.windows.net/backups/prod-pre-migration-<TIMESTAMP>.bacpac
```

**4. Revert code deployment:**

```bash
# If using Vercel:
vercel rollback

# If manual:
git revert <commit-hash>
git push origin main
npm run build && deploy
```

**5. Verify rollback:**
- Check database schema (columns removed)
- Check API endpoint (404 on /api/questions/practice)
- Check existing functionality (all working)

---

## Post-Deployment Monitoring

### Metrics to Watch (First 24 Hours)

**API Performance:**
- Response time: Target <500ms for GET, <1000ms for POST
- Error rate: Target <1%
- Request volume: Monitor for unexpected spikes

**Database:**
- Query execution time on new indexes
- Lock contention on questions table
- Storage usage (should not increase significantly)

**Application:**
- Next.js build errors (check Vercel logs)
- Prisma client errors (connection issues)
- OpenAI API errors (if generating new V3 questions)

### Monitoring Queries

```sql
-- 1. Check API usage (if logging to database)
SELECT 
  DATEPART(HOUR, createdAt) AS Hour,
  COUNT(*) AS RequestCount,
  AVG(DATEDIFF(MILLISECOND, createdAt, updatedAt)) AS AvgResponseTimeMs
FROM ApiLogs
WHERE endpoint LIKE '/api/questions/practice%'
  AND createdAt >= DATEADD(HOUR, -24, GETDATE())
GROUP BY DATEPART(HOUR, createdAt)
ORDER BY Hour DESC;

-- 2. Check new question generation (V3)
SELECT 
  visualType,
  COUNT(*) AS NewQuestions,
  MAX(createdAt) AS LatestQuestion
FROM questions
WHERE createdAt >= DATEADD(DAY, -1, GETDATE())
GROUP BY visualType;

-- 3. Check query performance on new indexes
SET STATISTICS IO ON;
SET STATISTICS TIME ON;

SELECT TOP 10 *
FROM questions
WHERE moduleType = 'math'
  AND visualType = 'bar-chart'
  AND difficultyScore BETWEEN 25 AND 50
  AND isActive = 1;
```

### Alert Thresholds

**Critical (immediate action):**
- API error rate >5%
- Response time >2000ms
- Database connection failures

**Warning (investigate within 1 hour):**
- API error rate >1%
- Response time >1000ms
- Unexpected NULL values in visualType/difficultyScore

**Info (review daily):**
- Low adoption of new visual types (<10% of queries use visualType filter)
- Uneven difficulty distribution in practice tests

---

## Success Criteria

**Deployment is considered successful when:**

- ✅ Database migration completes without errors
- ✅ All indexes created successfully
- ✅ Prisma client regenerated with new types
- ✅ API endpoint responds with 200 status
- ✅ Unit tests pass (31/31)
- ✅ Integration tests pass (24/24)
- ✅ No increase in error rate (remains <1%)
- ✅ Performance targets met (<500ms GET, <1000ms POST)
- ✅ Existing functionality unaffected (backward compatible)

**Post-Deployment Review** (1 week after):
- 📊 API usage analytics
- 📊 New visual type distribution
- 📊 Practice test generation patterns
- 📊 Performance benchmarks
- 📝 User feedback (if any)

---

## Contact & Support

**On-Call Engineer**: John Doe  
**Escalation**: Jane Smith (Engineering Manager)  
**Database Admin**: Azure Support  
**Rollback Authority**: Engineering Manager + Product Owner

**Incident Response**:
1. Create incident in PagerDuty
2. Notify #engineering-alerts Slack channel
3. Assess impact (severity 1-4)
4. Execute rollback if severity 1-2
5. Post-mortem within 48 hours

---

**Version History:**
- v1.0 (2026-02-17): Initial deployment guide

**Related Documents:**
- [Code Review](../docs/reviews/REVIEW-EPIC-34.md)
- [Migration Script](../prisma/migrations/001_add_visual_metadata_fields.sql)
- [API Documentation](../src/app/api/questions/practice/route.ts)
- [Test Results](../azuredev-038d-main/NEXT_STEPS_COMPLETED.md)
