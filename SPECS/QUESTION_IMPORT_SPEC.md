# Question Import System Specification

**Version:** 1.0  
**Date:** 2026-02-08  
**Status:** Draft → Implementation Ready

---

## 1. Overview

### 1.1 Purpose
Create a standardized system to:
1. Organize generated SAT questions into a structured folder format
2. Import questions from organized folders directly into the DuckSAT database
3. Make imported questions immediately available in practice tests

### 1.2 Current State Analysis

#### Existing Export Folder Structure
Location: `azuredev-038d-main/azuredev-038d-main/export/`

Current files (28 questions):
- `sat_question_TIMESTAMP.json` - Question data (question, choices, answer, explanation)
- `sat_complete_TIMESTAMP.html` - Complete HTML report
- `sat_diagram_TIMESTAMP.png` - Generated diagram image
- `sat_summary_TIMESTAMP.txt` - Human-readable summary
- `sat_validation_TIMESTAMP.json` - Validation results
- `sat_verification_TIMESTAMP.json` - Verification results

**Issue:** Files are flat and grouped by timestamp, not by question identity.

#### Database Schema (Prisma)
Key fields in `Question` model:
- Core: `question`, `options`, `correctAnswer`, `explanation`
- Module: `moduleType` (math/reading-writing), `category`, `subtopic`, `difficulty`
- Images: `imageData` (Bytes), `imageMimeType`, `imageAlt`, `imageUrl`
- Metadata: `timeEstimate`, `source`, `tags`, `isActive`
- Review: `reviewStatus`, `reviewRating`, `reviewComments`

---

## 2. Proposed Folder Structure

### 2.1 Organized Questions Directory

**Base Directory:** `organized-questions/`

**Structure:**
```
organized-questions/
├── question-001/
│   ├── metadata.json          # Question core data
│   ├── question.html          # Complete formatted question
│   ├── diagram.png            # Diagram/chart image (if exists)
│   ├── summary.txt            # Human-readable summary
│   ├── validation.json        # Quality validation data (optional)
│   └── verification.json      # Verification results (optional)
├── question-002/
│   ├── metadata.json
│   ├── question.html
│   ├── diagram.png
│   ├── summary.txt
│   ├── validation.json
│   └── verification.json
└── ...
```

### 2.2 metadata.json Format

```json
{
  "id": "question-001",
  "timestamp": "20251122_081244",
  "question": "In the right triangle ABC...",
  "choices": [
    "A) 4.0",
    "B) 4.8",
    "C) 6.0",
    "D) 9.6"
  ],
  "correctAnswer": "B",
  "correctAnswerIndex": 1,
  "answerValue": "4.8",
  "explanation": "In right triangle $ABC$...",
  "diagramDescription": "Draw coordinate-like diagram...",
  "hasDiagram": true,
  "moduleType": "math",
  "category": "geometry",
  "subtopic": "triangles",
  "difficulty": "medium",
  "timeEstimate": 90,
  "source": "Azure OpenAI GPT-4",
  "tags": ["geometry", "right-triangle", "altitude"],
  "validation": {
    "status": "PASS",
    "geometricallyValid": true,
    "questionDiagramMatch": true
  },
  "verification": {
    "qualityScore": 9,
    "answerCorrect": true,
    "recommendation": "APPROVE"
  }
}
```

### 2.3 File Requirements

| File | Required | Format | Purpose |
|------|----------|--------|---------|
| `metadata.json` | ✅ Yes | JSON | Core question data for DB import |
| `question.html` | ✅ Yes | HTML | Complete formatted question (reference) |
| `diagram.png` | ⚠️ Optional | PNG | Visual diagram/chart |
| `summary.txt` | ⚠️ Optional | Text | Human-readable summary |
| `validation.json` | ⚠️ Optional | JSON | Technical validation details |
| `verification.json` | ⚠️ Optional | JSON | Quality verification details |

---

## 3. Script 1: Folder Organization Script

### 3.1 Script Details

**Name:** `scripts/organize-export-questions.ts`

**Purpose:** Convert flat export folder into organized folder structure

**Input:** `azuredev-038d-main/azuredev-038d-main/export/` (flat files)

**Output:** `organized-questions/` (structured folders)

### 3.2 Functionality

1. **Scan Export Folder**
   - Find all `sat_question_*.json` files
   - Extract unique timestamps
   - Group related files by timestamp

2. **Create Question Folders**
   - Create `organized-questions/question-{number}/` for each question
   - Use sequential numbering (001, 002, etc.)

3. **Process Each Question**
   - Read `sat_question_TIMESTAMP.json`
   - Create enhanced `metadata.json` with:
     - Parsed question data
     - Module type detection (math keywords vs reading)
     - Category classification
     - Difficulty estimation
     - Timestamp preservation
   - Copy `sat_complete_TIMESTAMP.html` → `question.html`
   - Copy `sat_diagram_TIMESTAMP.png` → `diagram.png` (if exists)
   - Copy `sat_summary_TIMESTAMP.txt` → `summary.txt` (if exists)
   - Copy `sat_validation_TIMESTAMP.json` → `validation.json` (if exists)
   - Copy `sat_verification_TIMESTAMP.json` → `verification.json` (if exists)

4. **Generate Report**
   - Log organized questions count
   - Report any missing files
   - Create `organized-questions/README.md` with structure info

### 3.3 Classification Logic

**Module Type Detection:**
```typescript
function detectModuleType(question: string, choices: string[]): string {
  const mathKeywords = ['solve', 'calculate', 'equation', 'function', 'triangle', 
                        'area', 'perimeter', 'graph', 'coordinate'];
  const text = (question + ' ' + choices.join(' ')).toLowerCase();
  
  for (const keyword of mathKeywords) {
    if (text.includes(keyword)) return 'math';
  }
  
  return 'reading-writing';
}
```

**Category Detection:**
```typescript
function detectCategory(question: string, moduleType: string): string {
  if (moduleType === 'math') {
    if (hasGeometryKeywords(question)) return 'geometry';
    if (hasAlgebraKeywords(question)) return 'algebra';
    if (hasDataKeywords(question)) return 'data-analysis';
    return 'advanced-math';
  } else {
    return 'reading-comprehension';
  }
}
```

**Difficulty Estimation:**
- Default to 'medium'
- Could be enhanced with question complexity analysis later

---

## 4. Script 2: Database Import Script

### 4.1 Script Details

**Name:** `scripts/import-organized-questions.ts`

**Purpose:** Import organized questions into PostgreSQL database via Prisma

**Input:** `organized-questions/` (structured folders)

**Output:** Questions in database, ready for practice tests

### 4.2 Functionality

1. **Scan Organized Questions**
   - Find all `organized-questions/question-*/` folders
   - Sort by folder name (ensures consistent order)

2. **For Each Question Folder**
   - Read `metadata.json`
   - Check if question already exists (by timestamp or ID)
   - Skip duplicates or update if requested

3. **Process Images**
   - Read `diagram.png` if exists
   - Convert to Buffer for database storage
   - Set MIME type to 'image/png'
   - Generate alt text from diagram description

4. **Create Database Record**
   ```typescript
   await prisma.question.create({
     data: {
       question: metadata.question,
       options: metadata.choices,
       correctAnswer: metadata.correctAnswerIndex,
       explanation: metadata.explanation,
       moduleType: metadata.moduleType,
       category: metadata.category,
       subtopic: metadata.subtopic || null,
       difficulty: metadata.difficulty || 'medium',
       timeEstimate: metadata.timeEstimate || 90,
       imageData: imageBuffer,
       imageMimeType: 'image/png',
       imageAlt: metadata.diagramDescription,
       source: metadata.source || 'Azure OpenAI Generated',
       tags: metadata.tags || [],
       isActive: true,
       reviewStatus: metadata.verification?.recommendation === 'APPROVE' 
         ? 'approved' 
         : 'pending',
       reviewRating: metadata.verification?.qualityScore || null,
       reviewComments: metadata.validation?.status || null
     }
   });
   ```

5. **Import Statistics**
   - Track successful imports
   - Track skipped duplicates
   - Track errors
   - Generate summary report

### 4.3 Command Line Interface

```bash
# Import all questions
npm run db:import-organized

# Import with options
npx tsx scripts/import-organized-questions.ts --source organized-questions

# Skip duplicates (default)
npx tsx scripts/import-organized-questions.ts --skip-duplicates

# Update existing questions
npx tsx scripts/import-organized-questions.ts --update-existing

# Dry run (preview without importing)
npx tsx scripts/import-organized-questions.ts --dry-run
```

### 4.4 Duplicate Detection

Check if question exists by:
1. Exact question text match
2. Timestamp metadata match (if original question has timestamp tag)
3. Skip import if duplicate found (default behavior)

---

## 5. Integration with Practice Tests

### 5.1 Question Availability

Once imported, questions are immediately available because:
1. Questions are inserted into the `Question` table
2. `isActive` field is set to `true`
3. Practice test query: `SELECT * FROM questions WHERE isActive = true`

### 5.2 Practice Test Query Example

```typescript
// Existing practice test logic should already work
const questions = await prisma.question.findMany({
  where: {
    isActive: true,
    moduleType: requestedModuleType, // 'math' or 'reading-writing'
    difficulty: requestedDifficulty  // optional filter
  },
  take: numberOfQuestions
});
```

### 5.3 Image Rendering

Questions with diagrams will render using existing image rendering logic:
- Check `imageData` field
- If exists, serve as base64 or blob URL
- Display with `imageAlt` text for accessibility

---

## 6. Testing Strategy

### 6.1 Phase 1: Folder Organization Testing

**Test 1: Basic Organization**
```bash
# Run organization script
npx tsx scripts/organize-export-questions.ts

# Verify output
ls organized-questions/
cat organized-questions/question-001/metadata.json
```

**Expected:**
- 28 question folders created (question-001 to question-028)
- Each folder has at minimum: metadata.json, question.html
- Folders with diagrams have diagram.png
- All summaries copied correctly

**Test 2: Metadata Validation**
- Verify all metadata.json files are valid JSON
- Check required fields present
- Validate correctAnswerIndex is 0-3
- Ensure choices array has 4 items

### 6.2 Phase 2: Database Import Testing

**Test 1: Dry Run**
```bash
npx tsx scripts/import-organized-questions.ts --dry-run
```

**Expected:**
- Script reads all 28 questions
- No database changes
- Shows what would be imported

**Test 2: First Import**
```bash
npx tsx scripts/import-organized-questions.ts
```

**Expected:**
- All 28 questions imported successfully
- Database shows 28 new active questions
- Images stored correctly

**Test 3: Duplicate Detection**
```bash
# Run import again
npx tsx scripts/import-organized-questions.ts
```

**Expected:**
- All 28 questions skipped as duplicates
- No new records created

**Test 4: Database Verification**
```bash
npx tsx scripts/verify-imported-questions.ts
```

**Script should check:**
- Count of imported questions
- All have required fields
- Images loaded correctly
- Questions can be queried by moduleType, category, difficulty

### 6.3 Phase 3: Practice Test Integration Testing

**Test 1: Web UI Test**
1. Start development server: `npm run dev`
2. Navigate to practice test page
3. Start a math practice test
4. Verify imported questions appear
5. Verify diagrams render correctly
6. Submit test and check results

**Test 2: API Test**
```typescript
// Test script: scripts/test-practice-test-api.ts
const response = await fetch('/api/practice-test/questions', {
  method: 'POST',
  body: JSON.stringify({
    moduleType: 'math',
    numberOfQuestions: 10
  })
});

const data = await response.json();
console.log('Questions returned:', data.questions.length);
```

**Expected:**
- API returns questions including imported ones
- Questions include image data
- All fields properly formatted

---

## 7. Error Handling

### 7.1 Organization Script Errors

| Error | Handling |
|-------|----------|
| Missing JSON file | Log warning, skip question |
| Invalid JSON | Log error, skip question |
| Missing timestamp | Generate sequential ID |
| File read error | Log error, continue with other files |

### 7.2 Import Script Errors

| Error | Handling |
|-------|----------|
| Database connection failure | Exit with error message |
| Invalid metadata | Skip question, log error |
| Image read failure | Import without image, log warning |
| Duplicate question | Skip or update based on flag |
| Prisma validation error | Log full error, continue |

### 7.3 Logging

All scripts should log:
- Start time
- Progress (current/total)
- Warnings (non-fatal issues)
- Errors (with details)
- Summary statistics
- End time and duration

---

## 8. Documentation Requirements

### 8.1 User Documentation

Create: `organized-questions/README.md`

**Contents:**
- Folder structure explanation
- File format specifications
- How to add new questions manually
- Import instructions

### 8.2 Developer Documentation

Create: `scripts/README.md`

**Contents:**
- Script purposes
- Command line options
- Troubleshooting guide
- Extension points

### 8.3 Package.json Scripts

Add to `package.json`:
```json
{
  "scripts": {
    "questions:organize": "tsx scripts/organize-export-questions.ts",
    "questions:import": "tsx scripts/import-organized-questions.ts",
    "questions:verify": "tsx scripts/verify-imported-questions.ts"
  }
}
```

---

## 9. Future Enhancements

### 9.1 Phase 2 Features (Not in Initial Implementation)

1. **Batch Operations**
   - Import multiple organized-questions folders
   - Merge questions from different sources

2. **Question Editing**
   - Update script to modify existing questions
   - Version control for question changes

3. **Advanced Classification**
   - AI-powered category detection
   - Automatic difficulty calculation
   - Subtopic inference

4. **Quality Checks**
   - Duplicate content detection
   - Answer validation
   - Explanation completeness check

5. **Web UI for Import**
   - Admin dashboard for question management
   - Drag-and-drop folder import
   - Preview before import

---

## 10. Success Criteria

### 10.1 Completion Checklist

- [x] Specification document complete
- [ ] `organize-export-questions.ts` script created and tested
- [ ] `import-organized-questions.ts` script created and tested
- [ ] All 28 questions successfully organized into folders
- [ ] All 28 questions successfully imported into database
- [ ] Questions appear in practice tests
- [ ] Diagrams render correctly
- [ ] Documentation complete
- [ ] No regressions in existing functionality

### 10.2 Acceptance Criteria

1. **Organization Script:**
   - ✅ Processes all 28 export questions
   - ✅ Creates proper folder structure
   - ✅ Generates valid metadata.json for each
   - ✅ Preserves all original data

2. **Import Script:**
   - ✅ Imports all organized questions
   - ✅ Stores images correctly
   - ✅ Detects and skips duplicates
   - ✅ Provides clear progress feedback
   - ✅ Handles errors gracefully

3. **Integration:**
   - ✅ Imported questions visible in practice tests
   - ✅ Diagrams render in question view
   - ✅ Questions can be answered and scored
   - ✅ No impact on existing questions

4. **Quality:**
   - ✅ No data loss during organization
   - ✅ No data corruption during import
   - ✅ All required fields populated
   - ✅ Images maintain quality

---

## 11. Implementation Timeline

1. **Day 1: Organization Script** (2-3 hours)
   - Write organization script
   - Test with export data
   - Fix bugs, validate output

2. **Day 1: Import Script** (2-3 hours)
   - Write import script
   - Test database import
   - Validate data integrity

3. **Day 1: Testing** (1-2 hours)
   - End-to-end testing
   - Practice test integration
   - Bug fixes

4. **Day 1: Documentation** (30 minutes)
   - README files
   - Usage examples
   - Cleanup

**Total Estimated Time:** 6-9 hours

---

## 12. Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Data loss during organization | High | Low | Validate all files copied, keep originals |
| Import duplicates existing questions | Medium | Medium | Implement duplicate detection |
| Images too large for database | Medium | Low | Compress PNGs, set size limits |
| Breaking existing practice tests | High | Low | Test thoroughly, use feature flags |
| Script crashes mid-import | Medium | Low | Use transactions, allow resume |

---

## Appendix A: Example Question Structure

### Before (Export Folder)
```
export/
├── sat_question_20251122_081244.json
├── sat_complete_20251122_081244.html
├── sat_diagram_20251122_081244.png
├── sat_summary_20251122_081244.txt
├── sat_validation_20251122_081244.json
├── sat_verification_20251122_081244.json
└── ... (more files for other questions)
```

### After (Organized)
```
organized-questions/
├── question-001/
│   ├── metadata.json      (enhanced data from sat_question_*.json)
│   ├── question.html      (copy of sat_complete_*.html)
│   ├── diagram.png        (copy of sat_diagram_*.png)
│   ├── summary.txt        (copy of sat_summary_*.txt)
│   ├── validation.json    (copy of sat_validation_*.json)
│   └── verification.json  (copy of sat_verification_*.json)
└── ...
```

---

**End of Specification**
