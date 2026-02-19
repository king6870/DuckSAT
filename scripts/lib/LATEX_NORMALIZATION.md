# LaTeX Normalization System

## Overview

DuckSAT's LaTeX normalization system ensures consistent rendering across all platforms (database → JSON → browser → KaTeX).

**Status:** ✅ **Production Ready** (100% validation pass - 173 expressions, 450 questions)

## Core Principle

**"One backslash in, one backslash out"**

```
Database:       $\frac{1}{2}$         (single backslash)
    ↓
JSON.stringify: "$\\frac{1}{2}$"      (doubled for JSON transport)
    ↓
Browser parse:  $\frac{1}{2}$         (back to single)
    ↓
KaTeX render:   ½                     (formatted math)
```

## Normalization Rules

The `normalize-latex.ts` library applies these transformations:

1. **Remove control characters** - TAB (`\t`), CR (`\r`), NULL (`\0`), Form Feed, Backspace
2. **Collapse multiple backslashes** - `\\\\frac` → `\\frac` → `\frac`
3. **Remove `\newline`** - Replace with space
4. **Validate with KaTeX** - Ensure parseability before saving

## Architecture

### Write Paths (Normalization Points)

All data entry points normalize LaTeX before database write:

1. **Python Generators** (`azuredev-038d-main/`)
   - `sat_generator_v2.py` - normalize_latex() function
   - `sat_generator_v3.py` - normalize_latex() function
   - Applied before `json.dump()`

2. **TypeScript Import** (`scripts/`)
   - `import-new-batch-questions.ts` - normalizeLatex() calls
   - Applied before `prisma.question.create()`

3. **Database Migration** (`scripts/`)
   - `migrate-latex-final.ts` - one-time cleanup (completed)
   - Backup: `backup-pre-migration.json`

### Read Paths (No Transformation)

Data retrieval uses LaTeX as-is from database:

1. **HTML Export** (`scripts/export-all-questions-html.ts`)
   - **REMOVED:** 60 lines of `renderMath()` wrapping logic
   - **KEPT:** KaTeX auto-render only
   - Delimiters: `$...$` (inline), `$$...$$` (display)

2. **API Endpoints** (`src/app/api/`)
   - Return raw database content
   - Browser handles KaTeX rendering

## Usage

### For Developers

**Import the library:**
```typescript
import { normalizeLatex, normalizeLatexInOptions, validateLatex } from './lib/normalize-latex';

// Normalize question text
const cleanQuestion = normalizeLatex(question);

// Normalize multiple choice options
const cleanOptions = normalizeLatexInOptions(options);

// Validate LaTeX
const { valid, errors } = validateLatex(expression);
if (!valid) {
  console.error('Invalid LaTeX:', errors);
}
```

**Python generators:**
```python
def normalize_latex(text):
    """Normalize LaTeX for consistent rendering"""
    if not text:
        return text
    
    # Remove control chars
    result = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F]', '', text)
    
    # Collapse backslashes
    while '\\\\\\\\' in result:
        result = result.replace('\\\\\\\\', '\\\\')
    
    # Remove \newline
    result = result.replace(r'\newline', ' ')
    
    return result

# Apply before json.dump
question_data['question'] = normalize_latex(question_data['question'])
question_data['explanation'] = normalize_latex(question_data['explanation'])
question_data['choices'] = [normalize_latex(c) for c in question_data['choices']]
```

### For Users

**Validate database LaTeX:**
```bash
npm run validate:latex
```

**Expected output:**
```
Questions checked: 450
LaTeX expressions: 173
Valid: 173 (100%)
Invalid: 0
```

## Migration History

### Phase 1: Library Creation (Completed)
- Created `normalize-latex.ts` (479 lines)
- Created `validate-latex-final.ts` (140 lines)
- Created `migrate-latex-final.ts` (200 lines)

### Phase 2: Database Migration (Completed)
**Attempt 1 (Reverted):**
- Modified 97 questions
- Validation: 92 errors (auto-wrapping broke paired delimiters)
- Restored from backup

**Attempt 2 (Success):**
- Simplified normalization (no auto-wrapping)
- Modified 14 questions (control chars, double backslashes)
- Validation: 3 errors (missed `\\times` in options)

**Manual Fix:**
- Fixed remaining 3 questions with `fix-remaining-3.ts`

**Final Result:** ✅ 100% validation pass

### Phase 3: HTML Export Simplification (Completed)
- Removed 60 lines of `renderMath()` function
- Simplified to KaTeX auto-render only
- Regenerated `all-questions.html` (450 questions, 29 with diagrams)

### Phase 4: Import Path Fix (Completed)
- Added normalization to `import-new-batch-questions.ts`
- Ensures future imports have clean LaTeX

### Phase 5: Python Generator Fixes (Completed)
- Added `normalize_latex()` to `sat_generator_v2.py`
- Added `normalize_latex()` to `sat_generator_v3.py`
- Applied before all `json.dump()` calls

### Phase 6: Cleanup (Completed)
Deleted 12 obsolete scripts:
- `fix-json-latex.ts`, `fix-invalid-escapes.ts`, `fix-database-latex.ts`
- `fix-triple-backslashes.ts`, `fix-escape-chars.ts`, `fix-single-question.ts`
- `check-problem-latex.ts`, `check-raw-data.ts`, `check-single-question.ts`
- `migrate-latex-database.ts`, `check-json-latex.ts`, `check-raw-latex.ts`

## Files

### Production Files (Keep)
- `scripts/lib/normalize-latex.ts` - Core normalization library
- `scripts/validate-latex-final.ts` - Validation script
- `scripts/migrate-latex-final.ts` - Migration script (reference only)
- `scripts/restore-backup.ts` - Disaster recovery
- `scripts/fix-remaining-3.ts` - Manual fix reference
- `backup-pre-migration.json` - Database backup (delete after 30 days)

### Key Integration Points
- `scripts/import-new-batch-questions.ts` - Import normalization
- `scripts/export-all-questions-html.ts` - HTML export (simplified)
- `azuredev-038d-main/sat_generator_v2.py` - Python generator v2
- `azuredev-038d-main/sat_generator_v3.py` - Python generator v3

## Common LaTeX Patterns

**Fractions:**
```
✅ $\frac{1}{2}$
❌ $\\frac{1}{2}$
```

**Square Roots:**
```
✅ $\sqrt{x}$
❌ $\\sqrt{x}$
```

**Paired Delimiters:**
```
✅ $\left(\frac{1}{2}\right)$
❌ $\\left(\\frac{1}{2}\\right)$
```

**Multiple Operations:**
```
✅ $x^2 + 2x + 1$
❌ $x^2\t+\t2x\t+\t1$  (control chars)
```

## Troubleshooting

### KaTeX Parse Errors

**Symptom:** Browser console shows KaTeX parse errors

**Diagnosis:**
```bash
npm run validate:latex
```

**Common issues:**
1. Double backslashes (`\\frac`)
2. Control characters (TAB, CR)
3. Unbalanced delimiters (`\left(` without `\right)`)

**Fix:** Run migration script or manually correct in database

### Database Corruption

**Symptom:** Validation shows errors after manual edits

**Recovery:**
```bash
# Restore from backup
npx tsx scripts/restore-backup.ts

# Re-run migration
npx tsx scripts/migrate-latex-final.ts
```

## Testing

**Automated validation:**
```bash
npm run validate:latex
```

**Visual verification:**
1. Generate HTML: `npx tsx scripts/export-all-questions-html.ts`
2. Open: `all-questions.html` in browser
3. Check browser console for KaTeX errors
4. Search (Ctrl+F) for raw LaTeX: `\frac`, `\sqrt`, etc. (should find nothing)

**Import test:**
```bash
# Generate question with Python
cd azuredev-038d-main
python sat_generator_v3.py

# Import to database
cd ..
npm run questions:import

# Validate
npm run validate:latex
```

## Support

For issues or questions:
1. Check validation output: `npm run validate:latex`
2. Review migration history in this file
3. Examine `normalize-latex.ts` for transformation rules
4. Test with single question using `validateLatex()` function

---

**Last Updated:** January 2025
**Version:** 1.0.0
**Status:** Production Ready ✅
