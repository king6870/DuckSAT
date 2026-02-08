# Organized Questions

This folder contains SAT questions organized into a standardized structure.

## Structure

Each question is in its own folder: `question-XXX/`

### Files in Each Question Folder:

- **metadata.json** (required) - Complete question data for database import
- **question.html** (required) - Formatted HTML version of the question
- **diagram.png** (optional) - Visual diagram or chart
- **summary.txt** (optional) - Human-readable summary
- **validation.json** (optional) - Technical validation results
- **verification.json** (optional) - Quality verification results

## Import to Database

To import these questions into the DuckSAT database:

```bash
npm run questions:import
# or
npx tsx scripts/import-organized-questions.ts
```

## Statistics

- Total questions: 28
- Generated: 2026-02-08T20:57:37.438Z
- Source: Azure export folder

## Question Categories

Questions are automatically categorized by:
- Module type (math or reading-writing)
- Category (geometry, algebra, reading-comprehension, etc.)
- Difficulty level (easy, medium, hard)

---

For more information, see: SPECS/QUESTION_IMPORT_SPEC.md
