# Product Requirements Document: Generate 50 Practice Questions

**Epic**: Generate 50 SAT Questions for Practice Tests  
**Type**: Story (Quick Win)  
**Priority**: P0 (Immediate)  
**Created**: 2026-02-17  
**Status**: Draft

---

## 1. Overview

### Problem Statement
User needs 50 high-quality SAT questions (25 math, 25 reading-writing) generated immediately, displayed in a reviewable HTML format, and imported into the database for use in practice tests.

### Goals
1. Generate 50 questions using existing V3 generator
2. Display questions in browsable HTML format for review
3. Import questions to database for practice test use
4. Verify questions are accessible via Practice Test API

### Success Metrics
- ✅ 50 questions generated (25 math, 25 reading)
- ✅ HTML file displays all questions with correct answers
- ✅ Questions imported to database successfully
- ✅ Questions accessible via `/api/questions/practice` endpoint

---

## 2. User Requirements

### User Story
**As a** SAT student preparing for exams,  
**I want** access to 50 diverse practice questions with detailed explanations,  
**So that** I can practice math and reading-writing skills in realistic test conditions.

### Acceptance Criteria
1. ✅ Generate exactly 50 questions:
   - 25 math questions (algebra, geometry, data analysis, advanced math)
   - 25 reading-writing questions (grammar, rhetoric, comprehension)
2. ✅ Each question includes:
   - Question text
   - 4 multiple choice options (A, B, C, D)
   - Correct answer
   - Detailed explanation
   - Category and subtopic
   - Difficulty level (easy/medium/hard)
3. ✅ HTML display shows:
   - All 50 questions numbered sequentially
   - Visual separation between math and reading sections
   - Correct answers highlighted or in separate section
   - Easy navigation (table of contents)
4. ✅ Database import:
   - Questions saved to `questions` table
   - All fields populated correctly
   - `isActive = true` for immediate use
5. ✅ Practice test integration:
   - Questions queryable via Practice Test API
   - Filterable by moduleType, category, difficulty

---

## 3. Technical Requirements

### Functional Requirements (P0)

**FR1: Question Generation**
- Use existing `sat_generator_v3.py` script
- Generate 25 math questions with diverse categories:
  - Algebra (8 questions)
  - Geometry (6 questions)
  - Data Analysis (6 questions)
  - Advanced Math (5 questions)
- Generate 25 reading-writing questions with diverse types:
  - Grammar/Usage (10 questions)
  - Rhetoric/Style (8 questions)
  - Comprehension/Analysis (7 questions)
- All questions use Azure OpenAI API with quality validation
- Output: JSON files in `generated-questions/` directory

**FR2: HTML Display**
- Create standalone HTML file: `50-questions-display.html`
- Responsive design (mobile-friendly)
- Two-column layout for desktop, single column for mobile
- Table of contents with jump links
- Toggle to show/hide answers
- Print-friendly formatting
- No external dependencies (inline CSS)

**FR3: Database Import**
- Use Prisma client to import questions
- Map JSON fields to database columns:
  - question → question
  - options → options (JSON string)
  - correctAnswer → correctAnswer
  - explanation → explanation
  - category → category
  - subtopic → subtopic
  - difficulty → difficulty
  - moduleType → moduleType
- Set metadata:
  - isActive = true
  - generatedBy = 'v3-generator'
  - createdAt = current timestamp

**FR4: Practice Test API Integration**
- Verify via GET request:
  ```
  GET /api/questions/practice?moduleType=math&count=25
  GET /api/questions/practice?moduleType=reading-writing&count=25
  ```
- Confirm all 50 questions are retrievable
- Test filtering by category, difficulty

### Non-Functional Requirements

**NFR1: Performance**
- Generation: Complete in <10 minutes (avg 12 seconds per question)
- HTML load: <2 seconds for 50 questions
- Database import: <5 seconds for 50 questions
- API response: <500ms for query

**NFR2: Quality**
- All questions follow SAT format standards
- Explanations are clear and educational
- No duplicate questions in the batch
- Correct answers verified

**NFR3: Usability**
- HTML is readable without instructions
- Questions numbered clearly (1-50)
- Easy to toggle between showing/hiding answers
- Mobile-responsive display

---

## 4. User Flows

### Flow 1: Generate Questions
```
Engineer → Run generation script → Wait 8-10 minutes → Review JSON output → Verify 50 files created
```

### Flow 2: View Questions in HTML
```
Engineer → Open HTML file → Browse questions → Toggle answers → Verify quality
```

### Flow 3: Import to Database
```
Engineer → Run import script → Verify count (50 questions added) → Check database with Prisma Studio
```

### Flow 4: Use in Practice Test
```
Student → Start practice test → API fetches 25 questions → Student answers → Submit → See results
```

---

## 5. Out of Scope

- ❌ Custom question editor UI (use generated questions as-is)
- ❌ Question review/approval workflow (assume generated questions are high quality)
- ❌ Advanced analytics or tracking (basic database fields only)
- ❌ PDF export (HTML only for now)
- ❌ Manual question creation (AI-generated only)

---

## 6. Dependencies & Risks

### Dependencies
- ✅ Azure OpenAI API access (already configured)
- ✅ V3 generator code complete (`sat_generator_v3.py`)
- ✅ Prisma schema updated with question fields
- ✅ Database connection working
- ⏸️ Database migration (visualType/difficultyScore columns) - **Optional for this task**

### Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| OpenAI API rate limits | High | Low | Throttle requests (1 per 12 seconds) |
| Generation errors | Medium | Medium | Retry failed questions, log errors |
| Database import failures | High | Low | Validate JSON before import, use transactions |
| HTML display issues | Low | Low | Test in multiple browsers |

---

## 7. Implementation Plan

### Phase 1: Generation (30 minutes)
1. Run V3 generator script:
   ```bash
   cd azuredev-038d-main
   python sat_generator_v3.py --math 25 --reading 25
   ```
2. Verify 50 JSON files created in `generated-questions/`

### Phase 2: HTML Display (45 minutes)
1. Create TypeScript script: `scripts/generate-question-html.ts`
2. Read all 50 JSON files
3. Generate HTML with:
   - Header with title and instructions
   - Table of contents (Math section, Reading section)
   - Question cards with styling
   - Answer toggle button
   - Print stylesheet
4. Save as `50-questions-display.html`

### Phase 3: Database Import (15 minutes)
1. Create import script: `scripts/import-50-questions.ts`
2. Use Prisma client to insert questions
3. Handle duplicate detection (skip if question text already exists)
4. Log success/failure for each question

### Phase 4: API Verification (10 minutes)
1. Test GET requests:
   ```bash
   curl "http://localhost:3000/api/questions/practice?moduleType=math&count=25"
   ```
2. Verify response includes newly imported questions
3. Test filtering by category and difficulty

**Total Time Estimate: 1.5-2 hours**

---

## 8. Testing & Validation

### Test Cases

**TC1: Generation**
- [ ] Script runs without errors
- [ ] 50 JSON files created
- [ ] Each file contains valid JSON
- [ ] All required fields present (question, options, correctAnswer, explanation)

**TC2: HTML Display**
- [ ] HTML file opens in browser
- [ ] All 50 questions visible
- [ ] Math section has 25 questions
- [ ] Reading section has 25 questions
- [ ] Answer toggle works
- [ ] Mobile-responsive (test on phone)

**TC3: Database Import**
- [ ] Import script runs without errors
- [ ] 50 questions added to database
- [ ] All fields populated correctly
- [ ] No duplicate questions created

**TC4: API Retrieval**
- [ ] GET request returns questions
- [ ] Filtering by moduleType works
- [ ] Filtering by category works
- [ ] Filtering by difficulty works
- [ ] Response time <500ms

### Quality Checklist
- [ ] All questions follow SAT format
- [ ] Correct answers are actually correct
- [ ] Explanations are clear and detailed
- [ ] No typos or grammatical errors
- [ ] Categories and subtopics are accurate

---

## 9. Open Questions

**Q1: Should we execute the database migration first?**
- **Answer**: Optional. The migration adds `visualType` and `difficultyScore` columns, which are nullable. Existing schema works for basic question import.
- **Decision**: Skip migration for now, import with existing schema. Add visualType/difficultyScore later if needed.

**Q2: What if some questions fail generation?**
- **Answer**: Retry up to 3 times. If still failing, continue with successful questions. Log failures for later review.
- **Target**: At least 45/50 questions successfully generated (90% success rate).

**Q3: Should HTML file be committed to repository?**
- **Answer**: Yes, commit to `DuckSAT/output/html/50-questions-display.html` for easy review and sharing.

---

## 10. Definition of Done

### Engineer Checklist
- [ ] V3 generator script executes successfully
- [ ] 50 questions generated (25 math, 25 reading)
- [ ] HTML file created with all questions
- [ ] HTML file tested in Chrome, Firefox, mobile
- [ ] Import script executes successfully
- [ ] 50 questions in database (verified with Prisma Studio)
- [ ] API endpoint returns questions correctly
- [ ] All test cases passed
- [ ] HTML file committed to repository
- [ ] Documentation updated (add note to README about 50-question batch)

### Product Manager Sign-Off Criteria
- [ ] HTML file is readable and professional
- [ ] Sample 10 questions reviewed for quality
- [ ] Questions are diverse in difficulty and topics
- [ ] Explanations are clear and educational
- [ ] Practice test functionality works end-to-end

---

## 11. Timeline

**Sprint**: Current (Immediate)  
**Start Date**: 2026-02-17  
**Target Completion**: 2026-02-17 (Same day)  
**Estimated Effort**: 1.5-2 hours

---

## 12. Appendix

### A. Example Question Format (JSON)

```json
{
  "question": "If 3x + 5 = 14, what is the value of x?",
  "options": [
    "A) 2",
    "B) 3",
    "C) 4",
    "D) 5"
  ],
  "correctAnswer": "B",
  "explanation": "Solve for x: 3x = 14 - 5 = 9, therefore x = 3.",
  "category": "algebra",
  "subtopic": "linear-equations",
  "difficulty": "easy",
  "moduleType": "math"
}
```

### B. HTML Display Mockup

```html
<!DOCTYPE html>
<html>
<head>
  <title>50 SAT Practice Questions</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    .question { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .answer { display: none; background: #f0f0f0; padding: 10px; margin-top: 10px; }
    .show-answers .answer { display: block; }
  </style>
</head>
<body>
  <h1>50 SAT Practice Questions</h1>
  <button onclick="toggleAnswers()">Show/Hide Answers</button>
  
  <h2>Math Section (1-25)</h2>
  <div class="question">
    <h3>Question 1</h3>
    <p>If 3x + 5 = 14, what is the value of x?</p>
    <ul>
      <li>A) 2</li>
      <li>B) 3</li>
      <li>C) 4</li>
      <li>D) 5</li>
    </ul>
    <div class="answer">
      <strong>Answer: B</strong><br>
      Explanation: Solve for x: 3x = 14 - 5 = 9, therefore x = 3.
    </div>
  </div>
  <!-- ... 24 more math questions ... -->
  
  <h2>Reading & Writing Section (26-50)</h2>
  <!-- ... 25 reading questions ... -->
</body>
</html>
```

### C. Related Documents
- V3 Generator Code: `azuredev-038d-main/sat_generator_v3.py`
- V3 Technical Spec: `docs/specs/SPEC-DIVERSE-QUESTIONS-PRACTICE-TESTS.md`
- Practice Test API: `src/app/api/questions/practice/route.ts`
- Prisma Schema: `prisma/schema.prisma`

---

**Review Status**: Draft  
**Reviewers**: Engineer (Implementation), QA (Testing)  
**Approval**: Product Manager  
**Version**: 1.0
