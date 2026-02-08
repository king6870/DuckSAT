# Question Import System - Quick Reference

## 🚀 Quick Start (3 Commands)

```bash
npm run questions:organize   # Step 1: Organize
npm run questions:import     # Step 2: Import
npm run questions:verify     # Step 3: Verify
```

---

## 📁 File Structure

### Input (Export Folder)
```
azuredev-038d-main/azuredev-038d-main/export/
├── sat_question_TIMESTAMP.json     # Question data
├── sat_complete_TIMESTAMP.html     # Formatted HTML
├── sat_diagram_TIMESTAMP.png       # Diagram image
├── sat_summary_TIMESTAMP.txt       # Summary
├── sat_validation_TIMESTAMP.json   # Validation
└── sat_verification_TIMESTAMP.json # Verification
```

### Output (Organized)
```
organized-questions/
├── question-001/
│   ├── metadata.json      # ✅ Required
│   ├── question.html      # ✅ Required
│   ├── diagram.png        # Optional
│   ├── summary.txt        # Optional
│   ├── validation.json    # Optional
│   └── verification.json  # Optional
└── question-002/
    └── ...
```

---

## 🔧 Commands

### Basic Commands
```bash
# Organize questions
npm run questions:organize

# Import to database
npm run questions:import

# Verify import
npm run questions:verify
```

### Advanced Options
```bash
# Preview import (no changes)
npx tsx scripts/import-organized-questions.ts --dry-run

# Update existing questions
npx tsx scripts/import-organized-questions.ts --update-existing

# Import from custom folder
npx tsx scripts/import-organized-questions.ts --source ./my-questions
```

---

## 📊 What Each Script Does

### organize-export-questions.ts
- ✅ Scans export folder
- ✅ Groups files by timestamp
- ✅ Creates organized folders
- ✅ Generates metadata
- ✅ Auto-categorizes questions

### import-organized-questions.ts
- ✅ Reads organized questions
- ✅ Detects duplicates
- ✅ Loads images
- ✅ Creates DB records
- ✅ Reports statistics

### verify-imported-questions.ts
- ✅ Counts questions
- ✅ Analyzes categories
- ✅ Checks for issues
- ✅ Tests queries
- ✅ Shows samples

---

## 🎯 Common Workflows

### First Import
```bash
npm run questions:organize
npm run questions:import
npm run questions:verify
```

### Add New Questions
```bash
# After generating new questions:
npm run questions:organize
npm run questions:import    # Duplicates auto-skipped
```

### Update Questions
```bash
npm run questions:organize
npx tsx scripts/import-organized-questions.ts --update-existing
```

---

## ✅ Success Indicators

### Organization Success
```
✅ Successfully organized: 28
❌ Failed: 0
```

### Import Success
```
✅ Imported: 28
⏭️  Duplicates: 0
❌ Errors: 0
```

### Verification Success
```
✅ VERIFICATION PASSED
All questions valid and ready!
```

---

## ⚠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| Module not found | `npm install && npm run db:generate` |
| Export dir missing | Check path: `azuredev-038d-main/...` |
| DB connection error | Verify `.env` has `DATABASE_URL` |
| All duplicates | Normal if importing twice |
| Not in tests | Run `npm run questions:verify` |

---

## 📚 Documentation

- **Usage Guide:** [USAGE_GUIDE.md](USAGE_GUIDE.md)
- **Scripts Docs:** [scripts/README.md](scripts/README.md)
- **Full Spec:** [SPECS/QUESTION_IMPORT_SPEC.md](SPECS/QUESTION_IMPORT_SPEC.md)

---

## 🔍 Useful Commands

```bash
# Check database
npm run db:studio

# Count questions
npx tsx -e "
import {PrismaClient} from '@prisma/client';
const p = new PrismaClient();
p.question.count().then(c => {
  console.log(\`Questions: \${c}\`);
  p.\$disconnect();
});
"

# View organized folder
ls -la organized-questions/

# Check a question
cat organized-questions/question-001/metadata.json
```

---

## 💡 Tips

- ✅ Always verify after import
- ✅ Use dry-run when testing
- ✅ Keep organized-questions in git
- ✅ Back up DB before bulk updates
- ❌ Don't delete export files
- ❌ Don't modify organized-questions manually

---

## 📈 Integration

Once imported, questions automatically appear in:
- ✅ Practice tests
- ✅ Category-specific tests
- ✅ Difficulty filters
- ✅ Search results

Questions are filtered by:
- `isActive = true`
- `moduleType` (math/reading-writing)
- `category` (geometry, algebra, etc.)
- `difficulty` (easy, medium, hard)

---

**Questions? See [USAGE_GUIDE.md](USAGE_GUIDE.md)**
