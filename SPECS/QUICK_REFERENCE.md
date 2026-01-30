# ⚡ Quick Reference Card

## 30-Second Quickstart

```bash
# Generate sample questions AND import to database
npm run generate:questions -- --test-mode --import

# Result: 10 questions in database ✅
# Time: ~3 seconds ⚡
```

## Common Commands

```bash
# TEST MODE (No Azure needed)
npm run generate:questions -- --test-mode                    # Generate only
npm run generate:questions -- --test-mode --import           # Generate + import
npm run generate:questions -- --test-mode --math-only        # Math only
npm run generate:questions -- --test-mode --reading-only     # Reading only

# REAL GENERATION (Needs Azure)
npm run generate:questions -- --num-per-type 5 --import      # 50 questions
npm run generate:questions -- --math-only --import           # Math only
npm run generate:questions -- --reading-only --import        # Reading only
npm run generate:questions -- --type Equations --num-per-type 10 --import

# IMPORT EXISTING FILE
npm run generate:questions -- --import-from-file "path/to/file.json" --import
npm run generate:questions:import                            # Auto-import latest

# DEVELOPMENT
npm run dev -- --port 3001                                  # Start dev server
```

## Question Types Quick Reference

| Type | Category | Example |
|------|----------|---------|
| Equations | Math | Solve 2x + 5 = 17 |
| Geometry | Math | Find hypotenuse |
| WordProblems | Math | Train speed problem |
| Functions | Math | Evaluate f(x) = 2x+3 |
| Data | Math | Find mean/median |
| FillInBlank | Reading | Choose word in context |
| Details | Reading | What does passage say? |
| Summary | Reading | What's the main idea? |
| PassageDiagram | Reading | Interpret data with text |
| Research | Reading | What does evidence show? |

## File Locations

```
DuckSAT_CLEAN/
├── scripts/
│   ├── sat_unified_generator_v4.py       ← Main Python generator
│   ├── generate-questions.ts             ← TypeScript wrapper
│   └── generate_sample_questions.py      ← Test data generator
│
├── generated-questions/                  ← Output location
│   └── sample_questions_*.json           ← Generated JSON files
│
├── SYSTEM_STATUS.md                      ← You are here
├── IMPLEMENTATION_COMPLETE.md            ← Full technical docs
├── NPM_SCRIPTS.md                        ← All commands
└── QUESTION_GENERATION.md                ← Architecture details
```

## Test Checklist

```
☑ Sample generation works               npm run generate:questions -- --test-mode
☑ Database import works                 npm run generate:questions -- --test-mode --import
☑ Check DB has questions                npm run db:studio (see questions table)
☑ Practice test loads                   npm run dev && visit localhost:3001/practice-test
☑ Questions display correctly           (Check practice test loads questions)
☑ Answer validation works               (Select an answer and check validation)
```

## Troubleshooting Quick Links

| Issue | Solution |
|-------|----------|
| "Command not found" | Run: `npm install` in DuckSAT_CLEAN |
| "Azure auth error 401" | Use: `--test-mode` OR add `.env` credentials |
| "Database connection error" | Check `.env` has valid `DATABASE_URL` |
| "File not found" | Verify file exists: `ls generated-questions/` |
| "Questions not in practice test" | Restart dev server: `npm run dev` |

## Performance Expectations

```
Test Mode (no Azure):
├─ Generation: ~1 second for 10 questions
├─ Import: ~2 seconds
└─ Total: ~3 seconds

Real Generation (Azure):
├─ Generation: ~30-60 seconds per question
├─ Import: ~2 seconds
└─ Total: ~5-10 minutes for 50 questions
```

## Key Files Explained

### sat_unified_generator_v4.py (511 lines)
- Main Python generator
- Calls Azure OpenAI API
- 6-step validation pipeline
- Generates all 10 question types
- Exports to JSON

### generate-questions.ts (355 lines)
- CLI interface
- Calls Python generator
- Imports to database
- Handles test mode
- Error handling

### generate_sample_questions.py (232 lines)
- Test data generator
- No Azure required
- 10 hardcoded questions
- Same format as real generator

## Environment Setup

No setup needed for test mode!

For real generation, create `.env`:
```env
AZURE_OPENAI_KEY=your_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
OPENAI_API_VERSION=2024-08-01-preview
DATABASE_URL=postgresql://...  # Already configured
```

## Success = Green Checkmarks ✅

After running `npm run generate:questions -- --test-mode --import`, you should see:

```
🎓 SAT Question Generator - TypeScript Wrapper
✅ Successfully imported 10 questions to database

📊 Import Summary:
   ✅ Imported: 10
   ⏭️  Skipped: 0

✅ Generation workflow complete!
```

## Getting Help

1. **Read**: IMPLEMENTATION_COMPLETE.md (full technical docs)
2. **Reference**: NPM_SCRIPTS.md (all commands)
3. **Debug**: Check generated-questions/*.json files
4. **Check DB**: Run `npm run db:studio` to view questions

---

**Status**: 🟢 Ready to use
**All tests**: ✅ Passing
**Start with**: `npm run generate:questions -- --test-mode --import`
