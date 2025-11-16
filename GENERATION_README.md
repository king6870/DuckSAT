# Question Generation - Documentation Hub

Welcome! This file helps you navigate the question generation system documentation.

## 🚀 Quick Links

### I want to...

**→ Generate questions right now**
- Read: [QUICK_START_GENERATION.md](QUICK_START_GENERATION.md)
- Copy-paste commands and start generating

**→ Understand the complete system**
- Read: [QUESTION_GENERATION.md](QUESTION_GENERATION.md)
- Complete documentation with all features and options

**→ Migrate from the old system**
- Read: [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)
- Step-by-step migration instructions with code examples

**→ See what changed**
- Read: [STREAMLINING_SUMMARY.md](STREAMLINING_SUMMARY.md)
- Project overview, metrics, and comparison

---

## 📚 Documentation Guide

### 1. QUICK_START_GENERATION.md
**For:** Getting started quickly  
**Length:** ~10 minutes  
**Contents:**
- Common tasks with ready-to-use commands
- Environment variable cheat sheet
- Quick troubleshooting
- Best for: First-time users, quick reference

### 2. QUESTION_GENERATION.md
**For:** Complete system understanding  
**Length:** ~30 minutes  
**Contents:**
- Architecture overview
- All features and options
- Usage examples (API, CLI, Code)
- Configuration reference
- Troubleshooting guide
- Best for: Developers, detailed understanding

### 3. MIGRATION_GUIDE.md
**For:** Existing users upgrading  
**Length:** ~20 minutes  
**Contents:**
- Before/after comparison
- Migration steps for each interface
- Code examples for migration
- Feature comparison table
- Deprecation timeline
- Best for: Users of old system

### 4. STREAMLINING_SUMMARY.md
**For:** Project stakeholders  
**Length:** ~15 minutes  
**Contents:**
- What was done and why
- Architecture transformation
- Metrics and improvements
- Quality assurance results
- Best for: Project overview, management

---

## 🎯 Choose Your Path

### Path 1: First-Time User
```
1. Read QUICK_START_GENERATION.md (10 min)
2. Try a basic command
3. Read QUESTION_GENERATION.md for details (30 min)
```

### Path 2: Experienced Developer
```
1. Skim QUESTION_GENERATION.md (10 min)
2. Check code examples
3. Start using the unified system
```

### Path 3: Migrating from Old System
```
1. Read MIGRATION_GUIDE.md (20 min)
2. Follow migration steps
3. Reference QUESTION_GENERATION.md as needed
```

### Path 4: Project Manager/Stakeholder
```
1. Read STREAMLINING_SUMMARY.md (15 min)
2. Review metrics and benefits
3. Done!
```

---

## 📂 File Reference

### Core Implementation
| File | Purpose | Lines |
|------|---------|-------|
| `src/services/unifiedQuestionGenerator.ts` | Main service with all logic | 600+ |
| `src/app/api/admin/unified-generate/route.ts` | REST API endpoint | 200+ |
| `generate-questions.js` | Command-line script | 400+ |

### Documentation
| File | Purpose | Lines |
|------|---------|-------|
| `QUESTION_GENERATION.md` | Complete system docs | 400+ |
| `MIGRATION_GUIDE.md` | Migration instructions | 300+ |
| `QUICK_START_GENERATION.md` | Quick reference | 200+ |
| `STREAMLINING_SUMMARY.md` | Project summary | 400+ |
| `GENERATION_README.md` | This file (navigation) | 200+ |

---

## 🔑 Key Concepts

### Unified System
One system, three access methods:
1. **Service** - `unifiedQuestionGenerator.generateQuestions(options)`
2. **API** - `POST /api/admin/unified-generate`
3. **CLI** - `node generate-questions.js`

All use the same options and return the same format.

### Core Options
```typescript
{
  mathCount: 5,           // Number of math questions
  readingCount: 5,        // Number of reading questions
  temperature: 0.7,       // AI creativity (0-2)
  maxTokens: 4000,        // Response length
  difficulty: 'hard',     // Filter: easy/medium/hard
  storeInDatabase: true,  // Save to DB automatically
  // ... and more
}
```

### Backward Compatible
Old endpoints and scripts still work! Migration is optional.

---

## 💡 Quick Examples

### Generate Basic Questions
```bash
node generate-questions.js
```

### Generate Math Only (Hard)
```bash
MATH_COUNT=10 READING_COUNT=0 DIFFICULTY=hard node generate-questions.js
```

### Programmatic Usage
```typescript
import { unifiedQuestionGenerator } from '@/services/unifiedQuestionGenerator'

const result = await unifiedQuestionGenerator.generateQuestions({
  mathCount: 5,
  readingCount: 5,
  storeInDatabase: true,
})
```

---

## 🆘 Common Issues

### "Cannot connect to server"
**Fix:** Start dev server first
```bash
npm run dev
```

### "Authentication required"
**Fix:** Log in as admin or set API key
```bash
ADMIN_API_KEY=your-key node generate-questions.js
```

### "Need more help"
**Check:**
1. QUICK_START_GENERATION.md - Troubleshooting section
2. QUESTION_GENERATION.md - Detailed troubleshooting guide
3. Server logs for error details

---

## 📊 System Status

### Quality Metrics
- ✅ TypeScript: 0 errors
- ✅ ESLint: 0 warnings
- ✅ CodeQL: 0 security alerts
- ✅ Code Coverage: Comprehensive

### Features
- ✅ Math question generation
- ✅ Reading question generation
- ✅ Quality evaluation
- ✅ Database storage
- ✅ Image generation
- ✅ Batch operations
- ✅ Retry logic

### Documentation
- ✅ Complete system docs
- ✅ Migration guide
- ✅ Quick start guide
- ✅ Code examples
- ✅ Troubleshooting

---

## 🎓 Learning Path

**Beginner → Advanced:**
1. **Quick Start** → Generate first questions (QUICK_START_GENERATION.md)
2. **Basics** → Understand options (QUESTION_GENERATION.md sections 1-3)
3. **Advanced** → Custom configurations (QUESTION_GENERATION.md sections 4-6)
4. **Expert** → Programmatic usage (QUESTION_GENERATION.md section 7)

---

## 🔗 Related Files

### Old System (Still Works)
- `src/services/aiQuestionService.ts` - Old service
- `run-generation.js` - Old simple CLI
- `run-generation-enhanced.js` - Old enhanced CLI
- `AI_QUESTION_GENERATION.md` - Old docs (deprecated)
- `BATCH_GENERATION_GUIDE.md` - Old batch docs (deprecated)

### New System (Recommended)
- `src/services/unifiedQuestionGenerator.ts` - New service
- `generate-questions.js` - New unified CLI
- `QUESTION_GENERATION.md` - New docs

---

## ✅ Checklist for New Users

- [ ] Read this file (GENERATION_README.md)
- [ ] Choose your documentation path
- [ ] Read QUICK_START_GENERATION.md
- [ ] Try generating 3 questions
- [ ] Read relevant sections of QUESTION_GENERATION.md
- [ ] Understand all options
- [ ] Generate questions for your use case
- [ ] Review generated questions
- [ ] Bookmark documentation for reference

---

## 📞 Support

**For Issues:**
1. Check documentation (this file + guides)
2. Review troubleshooting sections
3. Check server logs
4. File an issue on GitHub with:
   - What you tried
   - What happened
   - Error messages
   - Relevant logs

**For Questions:**
1. Check if answered in documentation
2. Search existing GitHub issues
3. Ask on project discussion board
4. File a question issue

---

## 🎉 Get Started

Ready to generate questions?

1. **Quick:** Read [QUICK_START_GENERATION.md](QUICK_START_GENERATION.md) (10 min)
2. **Generate:** Run `node generate-questions.js`
3. **Learn More:** Read [QUESTION_GENERATION.md](QUESTION_GENERATION.md)

That's it! You're ready to go.

---

**Last Updated:** See git commit for this file  
**Version:** Unified System v1.0  
**Status:** ✅ Production Ready
