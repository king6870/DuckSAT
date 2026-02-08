# Question Import System - Scripts Documentation

This folder contains scripts for managing SAT questions in the DuckSAT application.

## Table of Contents

- [Overview](#overview)
- [Available Scripts](#available-scripts)
- [Workflow](#workflow)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)
- [Technical Details](#technical-details)

---

## Overview

The Question Import System provides a standardized way to:
1. **Organize** question exports into a structured folder format
2. **Import** questions into the PostgreSQL database
3. **Verify** imported questions are correctly stored

This system bridges the gap between AI-generated questions (from the export folder) and the DuckSAT practice test system.

---

## Available Scripts

### 1. `organize-export-questions.ts`

**Purpose:** Converts flat export folder structure into organized question folders.

**What it does:**
- Scans the `azuredev-038d-main/azuredev-038d-main/export/` folder
- Groups files by timestamp
- Creates individual folders for each question
- Generates enhanced metadata with automatic categorization
- Copies all related files (HTML, diagrams, summaries, etc.)

**Run:**
```bash
npm run questions:organize
# or
npx tsx scripts/organize-export-questions.ts
```

**Output:**
- Creates `organized-questions/` directory
- Each question in `organized-questions/question-XXX/` folder
- Generates a README.md with statistics

---

### 2. `import-organized-questions.ts`

**Purpose:** Imports organized questions into the database.

**What it does:**
- Reads questions from `organized-questions/` folder
- Checks for duplicates
- Loads diagram images as binary data
- Creates database records via Prisma
- Reports import statistics

**Run:**
```bash
npm run questions:import
# or
npx tsx scripts/import-organized-questions.ts
```

**Options:**
```bash
# Preview import without making changes
npx tsx scripts/import-organized-questions.ts --dry-run

# Import from a different folder
npx tsx scripts/import-organized-questions.ts --source ./my-questions

# Update existing questions instead of skipping
npx tsx scripts/import-organized-questions.ts --update-existing

# Skip duplicates (default behavior)
npx tsx scripts/import-organized-questions.ts --skip-duplicates
```

**Requirements:**
- Database connection configured in `.env` file
- `organized-questions/` folder with question data
- Prisma client generated (`npm run db:generate`)

---

### 3. `verify-imported-questions.ts`

**Purpose:** Verifies imported questions are valid and ready for use.

**What it does:**
- Counts total questions and active questions
- Analyzes distribution by module type, category, difficulty
- Checks for missing required fields
- Tests practice test queries
- Displays sample questions

**Run:**
```bash
npm run questions:verify
# or
npx tsx scripts/verify-imported-questions.ts
```

**Output:**
- Verification statistics
- Category and difficulty breakdowns
- Sample recent questions
- List of any issues found
- Practice test query results

---

## Workflow

### Complete Question Import Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Step 1: Generate Questions (AI System)                    │
│  Output: azuredev-038d-main/export/*.json, *.png, etc.    │
│                                                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Step 2: Organize Questions                                │
│  Command: npm run questions:organize                       │
│  Output: organized-questions/question-XXX/                 │
│                                                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Step 3: Import to Database                                │
│  Command: npm run questions:import                         │
│  Output: Questions in PostgreSQL database                  │
│                                                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Step 4: Verify Import                                     │
│  Command: npm run questions:verify                         │
│  Output: Verification report                               │
│                                                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Step 5: Use in Practice Tests                             │
│  Questions are now available in DuckSAT practice tests!    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Usage Examples

### Example 1: First-Time Import

```bash
# 1. Organize the export questions
npm run questions:organize

# 2. Preview what would be imported (dry run)
npx tsx scripts/import-organized-questions.ts --dry-run

# 3. Import questions into database
npm run questions:import

# 4. Verify everything is correct
npm run questions:verify
```

### Example 2: Adding New Questions

```bash
# 1. Generate new questions (output goes to export folder)
# ... your question generation process ...

# 2. Re-organize (will add new questions to organized-questions)
npm run questions:organize

# 3. Import only new questions (existing ones will be skipped)
npm run questions:import
```

### Example 3: Updating Existing Questions

```bash
# Update questions that already exist in the database
npx tsx scripts/import-organized-questions.ts --update-existing
```

### Example 4: Working with Custom Folder

```bash
# Organize from a different export location
npx tsx scripts/organize-export-questions.ts --source ./my-export-folder

# Import from a custom organized folder
npx tsx scripts/import-organized-questions.ts --source ./my-organized-questions
```

---

## Troubleshooting

### Issue: "MODULE_NOT_FOUND: @prisma/client"

**Solution:**
```bash
npm install
npm run db:generate
```

### Issue: "Export directory not found"

**Solution:**
Ensure the export folder exists at the correct path:
```
azuredev-038d-main/azuredev-038d-main/export/
```

### Issue: "Database connection error"

**Solution:**
1. Check your `.env` file has `DATABASE_URL` set
2. Verify database is running
3. Test connection: `npx prisma db push`

### Issue: "All questions skipped as duplicates"

This is normal behavior if you run import twice. Options:
- Use `--update-existing` to update instead of skip
- Clear database and re-import (not recommended for production)

### Issue: "Questions not appearing in practice tests"

**Check:**
1. Run verification: `npm run questions:verify`
2. Ensure `isActive` is `true` in database
3. Check question `moduleType` matches test filter
4. Restart Next.js dev server: `npm run dev`

---

## Technical Details

### Organized Questions Folder Structure

```
organized-questions/
├── README.md                    # Generated info about questions
├── question-001/
│   ├── metadata.json           # ✅ Required - Complete question data
│   ├── question.html           # ✅ Required - Formatted HTML
│   ├── diagram.png             # ⚠️  Optional - Visual diagram
│   ├── summary.txt             # ⚠️  Optional - Human-readable summary
│   ├── validation.json         # ⚠️  Optional - Technical validation
│   └── verification.json       # ⚠️  Optional - Quality verification
├── question-002/
│   └── ...
└── ...
```

### Metadata.json Format

```json
{
  "id": "question-001",
  "timestamp": "20251122_081244",
  "question": "Question text here...",
  "choices": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correctAnswer": "B",
  "correctAnswerIndex": 1,
  "answerValue": "4.8",
  "explanation": "Detailed explanation...",
  "diagramDescription": "Diagram description for alt text",
  "hasDiagram": true,
  "moduleType": "math",
  "category": "geometry",
  "subtopic": "triangles",
  "difficulty": "medium",
  "timeEstimate": 90,
  "source": "Azure OpenAI GPT-4",
  "tags": ["math", "geometry", "right-triangle", "AI-generated"],
  "validation": { ... },
  "verification": { ... }
}
```

### Database Schema Mapping

The import script maps metadata to Prisma Question model:

| metadata.json | Database Field | Type |
|--------------|----------------|------|
| `question` | `question` | String |
| `choices` | `options` | Json (Array) |
| `correctAnswerIndex` | `correctAnswer` | Int |
| `explanation` | `explanation` | Text |
| `moduleType` | `moduleType` | String |
| `category` | `category` | String |
| `subtopic` | `subtopic` | String? |
| `difficulty` | `difficulty` | String |
| `timeEstimate` | `timeEstimate` | Int |
| `tags` | `tags` | String[] |
| diagram.png | `imageData` | Bytes |
| - | `imageMimeType` | String |
| `diagramDescription` | `imageAlt` | String |
| `source` | `source` | String |
| - | `isActive` | Boolean (true) |
| `verification.recommendation` | `reviewStatus` | String |
| `verification.qualityScore` | `reviewRating` | Int? |
| `validation.status` | `reviewComments` | String? |

### Automatic Classification

The organization script automatically classifies questions:

**Module Type Detection:**
- Checks for math keywords (equation, triangle, calculate, etc.)
- Defaults to 'reading-writing' if no math keywords found

**Category Detection:**
- Geometry: triangle, circle, angle, area, etc.
- Algebra: equation, solve, variable, quadratic, etc.
- Data Analysis: mean, median, probability, statistics, etc.
- Advanced Math: fallback for other math topics
- Reading Comprehension: for non-math questions

**Subtopic Detection:**
- More specific categorization based on question content
- Examples: triangles, circles, linear-equations, etc.

### Duplicate Detection

Questions are considered duplicates if:
1. Exact question text match exists in database
2. Using case-sensitive comparison

When duplicate found:
- **Default behavior:** Skip import, log as duplicate
- **With --update-existing:** Update the existing record
- **Dry run mode:** Report what would happen

---

## Package.json Scripts

Added to `package.json`:

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

## Related Documentation

- **Full Specification:** `SPECS/QUESTION_IMPORT_SPEC.md`
- **Organized Questions Info:** `organized-questions/README.md`
- **Database Schema:** `prisma/schema.prisma`
- **Question Generation:** `QUESTION_GENERATION_ANALYSIS.md`

---

## Support

For issues or questions:
1. Check this documentation
2. Read the specification: `SPECS/QUESTION_IMPORT_SPEC.md`
3. Run verification to diagnose: `npm run questions:verify`
4. Check database with Prisma Studio: `npm run db:studio`

---

**Last Updated:** 2026-02-08  
**Version:** 1.0  
**Status:** Production Ready
