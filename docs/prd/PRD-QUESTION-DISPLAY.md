# PRD: Enhanced Question Generation Results Display

**Epic**: #TBD  
**Status**: Draft  
**Author**: Product Manager Agent  
**Date**: 2026-02-15  
**Stakeholders**: Admin Users, QA Team  
**Priority**: p1

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Target Users](#2-target-users)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [Requirements](#4-requirements)
5. [User Stories & Features](#5-user-stories--features)
6. [User Flows](#6-user-flows)
7. [Dependencies & Constraints](#7-dependencies--constraints)
8. [Risks & Mitigations](#8-risks--mitigations)
9. [Timeline & Milestones](#9-timeline--milestones)
10. [Out of Scope](#10-out-of-scope)
11. [Open Questions](#11-open-questions)
12. [Appendix](#12-appendix)

---

## 1. Problem Statement

### What problem are we solving?
Currently, when question generation completes on the Admin Question Generation page (`/admin/question-generation`), only timing statistics are displayed (generation time, accepted count). Admin users cannot immediately see the actual generated question text or the database IDs, making it impossible to verify questions were properly stored or preview their quality without navigating away from the page.

### Why is this important?
- **Verification Gap**: Admins cannot confirm questions were saved to the database without querying separately
- **Quality Assurance**: No immediate way to review generated question quality before leaving the page
- **Debugging Difficulty**: When generation fails or produces incorrect results, admins lack visibility into what was actually created
- **Workflow Inefficiency**: Requires switching to different admin pages to verify questions exist in the database

### What happens if we don't solve this?
- Admins waste time manually querying the database to verify questions were stored
- Poor quality questions may be deployed without immediate review
- Debugging generation issues becomes time-consuming and frustrating
- Admin confidence in the generation system decreases

---

## 2. Target Users

### Primary Users
**User Persona: SAT Content Admin**
- **Role**: Administrator responsible for generating and managing SAT practice questions
- **Demographics**: Educators, content managers, technical staff with admin access
- **Goals**: 
  - Generate high-quality SAT questions efficiently
  - Verify questions are properly stored in the database
  - Preview questions immediately after generation
  - Debug generation issues quickly
- **Pain Points**: 
  - Cannot see generated questions without additional API calls
  - No database ID shown to confirm storage
  - Previous attempt to fetch questions resulted in 500 errors
  - Must navigate to other pages to verify question quality
- **Behaviors**: 
  - Generates questions in batches (5-10 at a time)
  - Needs to verify each generation succeeded before moving to the next batch
  - Often needs to reference question IDs for database queries

### Secondary Users
**QA Engineers**: Need to verify question generation endpoint functionality and data integrity

---

## 3. Goals & Success Metrics

### Business Goals
1. **Increase Admin Efficiency**: Reduce time spent verifying question generation by 80%
2. **Improve Generation Transparency**: Provide full visibility into generated questions and their database state
3. **Reduce Support Tickets**: Decrease admin confusion about whether generation succeeded

### Success Metrics (KPIs)
| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Time to verify question saved | 60-90 seconds (manual query) | <5 seconds (on-page display) | Week 1 |
| Admin clicks to verify generation | 3-5 clicks (navigate + query) | 0 clicks (inline display) | Week 1 |
| Generation page abandonment rate | ~30% (leave without verification) | <10% | Month 1 |
| Admin reported "lost questions" | 2-3/week | 0/week | Month 1 |

### User Success Criteria
- Admins can see full question text immediately after generation completes
- Database IDs are visible for all successfully stored questions
- No 500 errors when displaying question data
- Question display works consistently whether from generation response or database fallback

---

## 4. Requirements

### 4.1 Functional Requirements

#### Must Have (P0)
1. **Question Text Display After Generation**
   - **User Story**: As an admin, I want to see the full generated question text immediately after generation completes so that I can verify the quality without additional queries
   - **Acceptance Criteria**: 
     - [ ] Full question text displays in a readable format after generation completes
     - [ ] LaTeX math is properly rendered using MathRenderer component
     - [ ] Display includes all question metadata (category, difficulty, module type)
     - [ ] Display works for all generated questions in the batch

2. **Database ID Display**
   - **User Story**: As an admin, I want to see the database ID for each generated question so that I can verify it was stored and reference it in future queries
   - **Acceptance Criteria**: 
     - [ ] Question ID displays prominently for each question card
     - [ ] ID is clearly labeled (e.g., "Question ID: abc123")
     - [ ] ID is copyable (text selection enabled)
     - [ ] If ID is not yet available (generation in progress), show "Pending..." status

3. **Fix 500 Error on Fallback API**
   - **User Story**: As an admin, I want the fallback question fetch to work reliably so that I can see questions even if the generation response doesn't include them
   - **Acceptance Criteria**: 
     - [ ] `/api/admin/questions` endpoint returns successfully for authenticated admins
     - [ ] Authentication errors are handled gracefully with clear error messages
     - [ ] Fallback only triggers when generation response lacks question data
     - [ ] Console errors are descriptive (not generic 500 messages)

#### Should Have (P1)
1. **Question Preview Enhancement**
   - **User Story**: As an admin, I want to see answer options and explanations in the results display so that I can fully evaluate question quality
   - **Acceptance Criteria**: 
     - [ ] All answer options display with letter labels (A, B, C, D)
     - [ ] Correct answer is visually indicated (icon or highlight)
     - [ ] Explanation text is visible (collapsible if long)

2. **Database Verification Link**
   - **User Story**: As an admin, I want a quick link to open the question in the database admin panel so that I can edit it if needed
   - **Acceptance Criteria**: 
     - [ ] Each question card includes "View in Database" button
     - [ ] Button opens `/admin/questions?id={questionId}` in new tab
     - [ ] Button is disabled if question ID not available yet

#### Could Have (P2)
1. **Question Export**
   - **User Story**: As an admin, I want to export generated questions as JSON so that I can share them with other team members or backup the data
   - **Acceptance Criteria**: 
     - [ ] "Export Questions" button available after generation
     - [ ] Export includes all question data and IDs
     - [ ] Downloaded file is valid JSON with human-readable formatting

#### Won't Have (Out of Scope)
- Inline question editing (editing requires full question editor)
- Regeneration of individual questions (requires full generation workflow)
- Historical generation logs (separate feature)

### 4.2 AI/ML Requirements

#### Technology Classification
- [x] **AI/ML powered** — LLM-based question generation (already implemented)
- [ ] **Rule-based / statistical** — not applicable
- [ ] **Hybrid** — not applicable

**Note**: This PRD focuses on display/UX improvements for existing AI question generation. No changes to model inference or generation logic.

### 4.3 Non-Functional Requirements

#### Performance
- **Response Time**: Question display renders within 500ms of generation completion
- **API Latency**: Fallback API call completes within 2 seconds
- **Rendering**: LaTeX math rendering completes within 1 second per question

#### Security
- **Authentication**: Only authenticated admin users can access generation page (existing)
- **Authorization**: Verify admin email in `/api/admin/questions` endpoint (fix existing bug)
- **Data Protection**: Question IDs can be shown (not sensitive data)

#### Usability
- **Accessibility**: Question cards readable by screen readers with proper ARIA labels
- **Mobile**: Responsive display for tablets (question cards stack vertically)
- **Error Messages**: Clear, actionable error messages if API fails

#### Reliability
- **Error Handling**: Gracefully handle missing IDs, failed API calls, rendering errors
- **Recovery**: Retry fallback API call once on 500 error before showing error message
- **Monitoring**: Log generation success/failure with question counts

---

## 5. User Stories & Features

### Feature 1: Real-Time Question Display
**Description**: Show generated questions in expandable cards immediately after generation completes  
**Priority**: P0  
**Epic**: #TBD

| Story ID | As a... | I want... | So that... | Acceptance Criteria | Priority | Estimate |
|----------|---------|-----------|------------|---------------------|----------|----------|
| US-1.1 | Admin | to see full question text after generation | I can verify quality immediately | • [ ] Question text displays below generation stats<br>• [ ] LaTeX renders correctly<br>• [ ] All questions in batch shown | P0 | 2 hours |
| US-1.2 | Admin | to see question metadata (category, difficulty) | I can confirm generation parameters were applied | • [ ] Metadata badges display on each card<br>• [ ] Colors match difficulty levels | P0 | 1 hour |
| US-1.3 | Admin | to see answer options and correct answer | I can validate question completeness | • [ ] All 4 options display with labels<br>• [ ] Correct answer marked with ✓ icon | P1 | 1.5 hours |

### Feature 2: Database ID Display
**Description**: Show database question ID prominently on each card  
**Priority**: P0

| Story ID | As a... | I want... | So that... | Acceptance Criteria | Priority | Estimate |
|----------|---------|-----------|------------|---------------------|----------|----------|
| US-2.1 | Admin | to see database ID for each question | I can verify it was stored | • [ ] ID displays at top of question card<br>• [ ] Format: "Question ID: abc123"<br>• [ ] Text is selectable/copyable | P0 | 30 minutes |
| US-2.2 | Admin | to see "Pending..." if ID not available yet | I know the question is still being saved | • [ ] Show "Pending..." status during save<br>• [ ] Auto-update to ID when available | P0 | 1 hour |
| US-2.3 | Admin | to click a link to view in database admin | I can quickly navigate to edit the question | • [ ] "View in DB" button on each card<br>• [ ] Opens in new tab<br>• [ ] Disabled if ID not available | P1 | 30 minutes |

### Feature 3: API Error Fix
**Description**: Fix 500 error in `/api/admin/questions` fallback call  
**Priority**: P0

| Story ID | As a... | I want... | So that... | Acceptance Criteria | Priority | Estimate |
|----------|---------|-----------|------------|---------------------|----------|----------|
| US-3.1 | Admin | the fallback API to authenticate properly | I don't see 500 errors in console | • [ ] Session properly passed to API route<br>• [ ] Admin email check succeeds<br>• [ ] No 500 errors logged | P0 | 1 hour |
| US-3.2 | Admin | clear error messages if API fails | I know what went wrong | • [ ] 401: "Not authorized" message<br>• [ ] 500: "Server error, see logs"<br>• [ ] Network: "Connection failed" | P1 | 30 minutes |

---

## 6. User Flows

### Primary Flow: View Generated Questions
**Trigger**: Admin clicks "Generate Questions" and generation completes  
**Preconditions**: Admin is logged in, has admin role (email in ADMIN_EMAILS)

**Steps**:
1. Admin configures settings (topic, count, difficulty) and clicks "Generate Questions"
2. System shows progress steps (Initializing → Generating → Validating → Storing)
3. Generation completes successfully
4. System displays summary stats (generated count, time)
5. System displays generated questions in expandable cards below stats
6. Each card shows:
   - Question ID (or "Pending..." if not yet saved)
   - Question text with LaTeX rendered
   - Category, difficulty, module type badges
   - Answer options (A, B, C, D) with correct answer marked
   - Explanation (expandable)
   - "View in Database" button (if ID available)
7. Admin reviews questions, verifies IDs are present
8. **Success State**: Admin can see all generated questions with database IDs

### Alternate Flow 1: Fallback API Needed
**Trigger**: Generation response doesn't include full question objects with IDs  
**Steps**:
1. System attempts to fetch latest questions from `/api/admin/questions?limit={count}&page=1`
2. If successful: Display questions from API response
3. If 401 error: Show "Not authorized to view questions" message
4. If 500 error: Retry once after 500ms
5. If still fails: Show "Could not load questions from database. Check server logs."
6. **Success State**: Questions display from fallback source OR clear error message shown

### Error Flow 1: Generation Fails
**Trigger**: Generation API returns error or throws exception  
**Steps**:
1. System catches error during generation
2. System updates progress step to "error" status with message
3. System displays error alert: "Generation failed: {error message}"
4. No questions displayed (state remains empty)
5. Admin can adjust settings and retry
6. **Success State**: Clear error message, option to retry

---

## 7. Dependencies & Constraints

### Technical Dependencies
1. **Existing Generation API** (`/api/admin/enhanced-generate-questions`): Must return question objects with or without IDs
2. **Database API** (`/api/admin/questions`): Must support pagination and authentication
3. **MathRenderer Component**: Must handle LaTeX in question text
4. **Session Management**: NextAuth session must be available in client components

### External Constraints
- **Authentication**: Admin email check happens server-side (cannot be bypassed)
- **Database Schema**: Question IDs are UUIDs assigned by Prisma (cannot control format)
- **Rendering Performance**: LaTeX rendering can take 500-1000ms per question (affects UX)

### Data Constraints
- Questions may not have IDs immediately after generation (save happens async)
- Fallback API returns paginated results (may not match exact generation batch)
- Generated questions may fail quality check and not be saved (expected behavior)

---

## 8. Risks & Mitigations

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **IDs not available immediately** | High | Medium | Show "Pending..." status, poll for IDs, or accept that IDs appear on refresh |
| **Fallback API still returns 500** | Medium | High | Fix authentication in API route, add retry logic, improve error messages |
| **LaTeX rendering fails** | Low | Medium | Catch rendering errors, show raw text fallback, log errors |
| **Questions array empty after generation** | Medium | Medium | Check generation response structure, improve error handling, show clear message |

### UX Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Too much info overwhelms UI** | Medium | Low | Make cards collapsible, show summary by default, expand on click |
| **Admins confused by "Pending..."** | Low | Low | Add tooltip: "Question is being saved to database" |
| **Long questions break layout** | Low | Low | Use `overflow-wrap: break-word`, limit height with scroll |

### Security Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Non-admin sees question IDs** | Low | Low | Server-side auth check already exists, ensure client respects session |
| **Question content leaked in logs** | Low | Medium | Don't log full question text, only metadata |

---

## 9. Timeline & Milestones

### Phase 1: Fix API Error (Week 1, Days 1-2)
- [ ] Investigate 500 error in `/api/admin/questions` (2 hours)
- [ ] Fix authentication/authorization issue (1 hour)
- [ ] Add retry logic and better error handling (1 hour)
- [ ] Test with authenticated admin session (30 minutes)
- **Total**: 4.5 hours

### Phase 2: Question Display UI (Week 1, Days 2-3)
- [ ] Modify generation page component to display questions (2 hours)
- [ ] Add question ID display with "Pending..." fallback (1.5 hours)
- [ ] Add metadata badges (category, difficulty, module) (1 hour)
- [ ] Add answer options display with correct answer indicator (1.5 hours)
- [ ] Add collapsible explanation section (1 hour)
- **Total**: 7 hours

### Phase 3: Polish & Testing (Week 1, Day 4)
- [ ] Add "View in Database" button (30 minutes)
- [ ] Improve error messages (30 minutes)
- [ ] Test with various question types (math, reading) (1 hour)
- [ ] Test fallback API flow (30 minutes)
- [ ] Test error scenarios (API down, no auth) (1 hour)
- **Total**: 3.5 hours

### Phase 4: Documentation & Deploy (Week 1, Day 5)
- [ ] Update admin documentation (30 minutes)
- [ ] Create testing checklist (30 minutes)
- [ ] Deploy to staging (15 minutes)
- [ ] Smoke test in staging (30 minutes)
- [ ] Deploy to production (15 minutes)
- **Total**: 2 hours

**Total Estimated Time**: 17 hours (~2-3 days)

---

## 10. Out of Scope

The following features are explicitly **not** included in this release:

- **Inline Question Editing**: Editing questions requires the full question editor interface (separate feature)
- **Regenerate Single Question**: Regenerating individual questions requires full generation flow
- **Historical Generation Logs**: Viewing past generation batches (future admin analytics feature)
- **Bulk Export**: Exporting multiple generation batches at once (P2, not critical)
- **Question Preview in Modal**: Opening questions in full-screen modal (nice-to-have, not MVP)
- **Real-Time ID Updates**: Polling for question IDs after "Pending..." appears (async complexity not justified)

---

## 11. Open Questions

1. **Q**: Should we poll for question IDs after showing "Pending...", or require refresh?
   - **A**: Accept that IDs appear on page refresh. Polling adds complexity without clear benefit.

2. **Q**: What if generation succeeds but database save fails?
   - **A**: Show questions from generation response with "Pending..." IDs. User can refresh to verify save.

3. **Q**: Should we show questions that failed quality check?
   - **A**: No. Only show questions that passed validation and are being saved.

4. **Q**: What's the max number of questions to display at once?
   - **A**: Current generation limit is 10 questions per batch. All should display (no pagination needed).

5. **Q**: Should question cards be expanded or collapsed by default?
   - **A**: Collapsed by default (show title + metadata). Expand on click to see full question + answers.

---

## 12. Appendix

### A. Current Implementation Analysis

**File**: `src/app/admin/question-generation/page.tsx`

**Current Behavior** (Lines 180-220):
- Generation completes and stores questions in `questions` state array
- Tries to fetch from `/api/admin/questions` as fallback (line 194)
- Gets 500 error due to authentication issue
- Questions array is populated but only displays in interactive quiz format (line 434+)
- No database IDs shown anywhere

**Data Flow**:
```
1. POST /api/admin/enhanced-generate-questions
   ├─ Returns: { questions: [...], summary: { generated, accepted }, quality: {...} }
   └─ questions[] may or may not have IDs

2. Fallback: GET /api/admin/questions?limit=5&page=1
   ├─ Purpose: Fetch questions with IDs from database
   ├─ Currently fails with 500 (auth issue)
   └─ IF successful: questions[] has IDs

3. State: questions[] stored in React state
   ├─ Displayed in interactive cards (line 434+)
   └─ IDs not shown even if available
```

### B. API Routes

**Generation API**: `/api/admin/enhanced-generate-questions` (POST)
- Returns: `{ questions: Question[], summary: {...}, quality: {...} }`
- Questions may have IDs if database save completed
- Questions structure: `{ question, options, correctAnswer, explanation, category, subtopic, difficulty, moduleType, qualityScore?, id? }`

**Admin Questions API**: `/api/admin/questions` (GET)
- Requires: Authenticated admin session
- Query params: `?limit={n}&page={n}&status={pending|approved|rejected}`
- Returns: `{ questions: Question[], total: number }`
- **Current Issue**: Line 11-13 check admin auth, likely failing

### C. UI Component Location

**File**: `src/app/admin/question-generation/page.tsx`

**Lines 434-520**: Existing question display cards
- Already shows question text, options, category badges
- Already has interactive answer selection
- Already shows explanation on expand
- **Missing**: Question ID display

**Proposed Changes**:
1. Add question ID display at line 452 (inside card header)
2. Fix fallback API auth issue in `/api/admin/questions/route.ts`
3. Add "View in Database" button at line 560+ (after explanation)

### D. Error Log Analysis

**Error**: `GET http://localhost:3000/api/admin/questions?limit=1&page=1 500 (Internal Server Error)`

**File**: `page.tsx:194`
```typescript
const latestResponse = await fetch(`/api/admin/questions?limit=${settings.questionCount}&page=1`, {
  credentials: 'include'
})
```

**Root Cause**: Session not properly passed or admin check failing in API route

**Fix Location**: `src/app/api/admin/questions/route.ts`, lines 10-13
```typescript
const session = await getServerSession(authOptions)
if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Potential Issue**: `getServerSession` may be returning null in client-initiated fetch

### E. Acceptance Testing Checklist

- [ ] Generate 5 questions as admin user
- [ ] Verify all 5 questions display with IDs (or "Pending...")
- [ ] Verify LaTeX math renders correctly
- [ ] Verify answer options display with correct answer marked
- [ ] Verify metadata badges show correct values
- [ ] Click "View in Database" button, verify opens correct page
- [ ] Generate questions with no topic selected, verify displays correctly
- [ ] Refresh page after generation, verify IDs now appear (if were "Pending...")
- [ ] Test as non-admin user, verify cannot access page
- [ ] Generate questions with API down, verify clear error message
- [ ] Generate questions with database down, verify generation succeeds but IDs show "Pending..."
