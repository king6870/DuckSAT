# Question Import System - Usage Guide

## Quick Start

This guide will help you import generated SAT questions into the DuckSAT database in 3 simple steps.

### Prerequisites

✅ Node.js and npm installed  
✅ Database configured in `.env` file  
✅ Questions generated in the export folder  

### 3-Step Import Process

```bash
# Step 1: Organize exported questions
npm run questions:organize

# Step 2: Import into database
npm run questions:import

# Step 3: Verify import succeeded
npm run questions:verify
```

That's it! Your questions are now available in DuckSAT practice tests.

---

## Detailed Workflow

### Step 1: Organize Questions

**What happens:**
- Scans `azuredev-038d-main/azuredev-038d-main/export/` folder
- Groups files by timestamp
- Creates `organized-questions/question-XXX/` folders
- Copies all related files
- Generates metadata with automatic categorization

**Run:**
```bash
npm run questions:organize
```

**Expected output:**
```
╔════════════════════════════════════════════════════════════╗
║     Question Organization Script                          ║
╚════════════════════════════════════════════════════════════╝

✅ Created output directory: organized-questions/
📂 Found 28 question files in export folder

[1/28] Processing sat_question_20251122_081244.json...
  └─ ID: question-001, Timestamp: 20251122_081244
  ✓ Created metadata.json
  ✓ Copied question.html
  ✓ Copied diagram.png
  ✓ Copied summary.txt
  ✅ Question organized successfully

... (more questions) ...

╔════════════════════════════════════════════════════════════╗
║     Organization Summary                                   ║
╠════════════════════════════════════════════════════════════╣
║ ✅ Successfully organized:  28                         ║
║ ❌ Failed:                   0                         ║
║ 📊 Total processed:         28                         ║
╚════════════════════════════════════════════════════════════╝

✨ Questions organized in: organized-questions/
```

**What to check:**
- ✅ All questions organized successfully
- ✅ `organized-questions/` folder created
- ✅ Each question has `metadata.json`

---

### Step 2: Import to Database

**What happens:**
- Reads organized questions
- Checks for duplicates
- Loads diagrams as binary data
- Creates database records
- Reports statistics

**Run:**
```bash
npm run questions:import
```

**Expected output:**
```
╔════════════════════════════════════════════════════════════╗
║     Question Import Script                                 ║
╚════════════════════════════════════════════════════════════╝

📂 Source folder: organized-questions/
🔄 Mode: Skip duplicates
📝 Found 28 question folders

[1/28] Importing question-001...
  📄 "In the right triangle ABC, a right angle is at A..."
  🏷️  math > geometry > medium
  📷 Diagram loaded (39.7 KB)
  ✅ Imported successfully

... (more questions) ...

╔════════════════════════════════════════════════════════════╗
║     Import Summary                                         ║
╠════════════════════════════════════════════════════════════╣
║ ✅ Imported:    28                                    ║
║ 🔄 Updated:      0                                    ║
║ ⏭️  Duplicates:   0                                    ║
║ ❌ Errors:       0                                    ║
║ 📊 Total:       28                                    ║
╚════════════════════════════════════════════════════════════╝

✨ Questions are now available in the DuckSAT practice tests!
```

**What to check:**
- ✅ All questions imported successfully
- ✅ No errors in the log
- ✅ Images loaded correctly

---

### Step 3: Verify Import

**What happens:**
- Queries database for all questions
- Analyzes distribution and completeness
- Checks for issues
- Tests practice test queries

**Run:**
```bash
npm run questions:verify
```

**Expected output:**
```
╔════════════════════════════════════════════════════════════╗
║     Question Verification Script                          ║
╚════════════════════════════════════════════════════════════╝

🔍 Analyzing questions in database...

╔════════════════════════════════════════════════════════════╗
║     Verification Results                                   ║
╠════════════════════════════════════════════════════════════╣
║ Total Questions:              28                        ║
║ Active Questions:             28                        ║
║ Recently Imported (<1hr):     28                        ║
╠════════════════════════════════════════════════════════════╣
║ Math Questions:               28                        ║
║ Reading/Writing Questions:     0                        ║
╠════════════════════════════════════════════════════════════╣
║ With Images/Diagrams:         28                        ║
║ With Explanations:            28                        ║
╠════════════════════════════════════════════════════════════╣
║ Approved:                     28                        ║
║ Pending Review:                0                        ║
╚════════════════════════════════════════════════════════════╝

📚 Questions by Category:
   geometry                    28 ████████████████████████████

📊 Questions by Difficulty:
   medium      28 ████████████████████████████

✅ No issues found - all questions are valid!

╔════════════════════════════════════════════════════════════╗
║  ✅ VERIFICATION PASSED                                   ║
║  All questions are valid and ready for practice tests!    ║
╚════════════════════════════════════════════════════════════╝
```

**What to check:**
- ✅ No issues found
- ✅ All questions are active
- ✅ Practice test queries work

---

## Common Scenarios

### Scenario 1: First-Time Setup

You have questions in the export folder and want to import them for the first time.

```bash
# 1. Organize
npm run questions:organize

# 2. Preview (optional - see what would be imported)
npx tsx scripts/import-organized-questions.ts --dry-run

# 3. Import
npm run questions:import

# 4. Verify
npm run questions:verify

# 5. View in Prisma Studio (optional)
npm run db:studio
```

---

### Scenario 2: Adding New Questions

You have generated new questions and want to add them to the existing database.

```bash
# 1. Generate new questions
# ... your generation process ...
# New files appear in export folder

# 2. Re-organize (will add new questions to organized-questions)
npm run questions:organize

# 3. Import (duplicates will be skipped automatically)
npm run questions:import

# 4. Verify
npm run questions:verify
```

**Note:** Existing questions will be skipped automatically. Only new questions will be imported.

---

### Scenario 3: Updating Questions

You've improved some questions and want to update them in the database.

```bash
# 1. Update source files in export folder
# ... your editing process ...

# 2. Re-organize
npm run questions:organize

# 3. Import with update flag
npx tsx scripts/import-organized-questions.ts --update-existing

# 4. Verify
npm run questions:verify
```

---

### Scenario 4: Dry Run Testing

You want to preview what would be imported without making database changes.

```bash
# Organize questions first
npm run questions:organize

# Run import in dry-run mode
npx tsx scripts/import-organized-questions.ts --dry-run

# Review output, then import for real
npm run questions:import
```

---

## Database Setup

### 1. Set Up Environment Variables

Create a `.env` file in the project root:

```env
# Database Configuration
DATABASE_URL=postgres://user:password@host:5432/dbname?sslmode=require

# Other required variables
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
```

### 2. Initialize Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# (Optional) Seed with topics
npm run db:seed-topics
```

### 3. Test Connection

```bash
# Open Prisma Studio
npm run db:studio

# Should open in browser at http://localhost:5555
# Browse existing data to verify connection
```

---

## Viewing Questions

### Method 1: Prisma Studio (Recommended)

```bash
npm run db:studio
```

Opens a visual database browser where you can:
- View all questions
- Filter by category, difficulty, module type
- See images inline
- Edit questions manually
- Export data

### Method 2: Practice Test (End-User View)

```bash
# Start dev server
npm run dev

# Navigate to: http://localhost:3000
# Start a practice test
# Your imported questions will appear!
```

### Method 3: Verification Script

```bash
npm run questions:verify
```

Shows statistics and sample questions directly in terminal.

---

## Maintenance Tasks

### Re-import All Questions

```bash
# Warning: This will skip duplicates by default
npm run questions:import

# To update all existing questions instead
npx tsx scripts/import-organized-questions.ts --update-existing
```

### Clean Up Organized Questions

```bash
# Remove organized-questions folder
rm -rf organized-questions/

# Re-organize from export folder
npm run questions:organize
```

### Check Database Status

```bash
# Run verification
npm run questions:verify

# Open Prisma Studio
npm run db:studio

# Check question count
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.question.count().then(count => {
  console.log(\`Total questions: \${count}\`);
  prisma.\$disconnect();
});
"
```

---

## Troubleshooting

### Questions Not Appearing in Tests

**Possible causes:**
1. Questions not marked as active
2. Module type doesn't match test filter
3. Next.js cache issue

**Solutions:**
```bash
# Check question status
npm run questions:verify

# Restart dev server
npm run dev

# Check database directly
npm run db:studio
```

---

### Import Errors

**Error: "Cannot find module @prisma/client"**

```bash
npm install
npm run db:generate
```

**Error: "Database connection failed"**

Check your `.env` file:
```bash
cat .env | grep DATABASE_URL
```

Test connection:
```bash
npm run db:push
```

**Error: "Export directory not found"**

Verify the export folder exists:
```bash
ls -la azuredev-038d-main/azuredev-038d-main/export/
```

---

### Duplicate Questions

**All questions skipped as duplicates:**

This is normal if you run import twice. Options:

1. **Keep as-is** (recommended if questions unchanged)
2. **Update existing questions:**
   ```bash
   npx tsx scripts/import-organized-questions.ts --update-existing
   ```
3. **Remove and re-import** (not recommended):
   ```bash
   # Manually delete questions in Prisma Studio
   # Then re-import
   npm run questions:import
   ```

---

## Best Practices

### ✅ Do's

- Always run verification after import
- Use dry-run mode when testing
- Keep organized-questions folder under version control
- Back up database before bulk updates
- Use descriptive commit messages when organizing questions

### ❌ Don'ts

- Don't delete original export files
- Don't modify organized-questions manually (re-organize instead)
- Don't skip verification step
- Don't force-update questions without reviewing changes
- Don't commit database credentials to git

---

## Integration with Practice Tests

Once imported, questions are automatically available in practice tests:

**How it works:**
1. Questions are stored in database with `isActive = true`
2. Practice test queries filter by `moduleType` and `difficulty`
3. Images are served from database as binary data
4. Explanations shown after answering

**Example query:**
```typescript
const questions = await prisma.question.findMany({
  where: {
    isActive: true,
    moduleType: 'math',
    difficulty: 'medium'
  },
  take: 10
});
```

Questions will automatically appear in:
- Practice tests
- Category-specific tests
- Difficulty-filtered tests
- Search results

---

## Next Steps

After importing questions:

1. **Test in UI:** Start dev server and take a practice test
2. **Review Quality:** Check questions in Prisma Studio
3. **Generate More:** Use AI to generate additional questions
4. **Repeat Process:** Organize → Import → Verify

---

## Support Resources

- **Full Specification:** `SPECS/QUESTION_IMPORT_SPEC.md`
- **Scripts Documentation:** `scripts/README.md`
- **Database Schema:** `prisma/schema.prisma`
- **Question Generation:** `QUESTION_GENERATION_ANALYSIS.md`

---

**Happy importing! 🎉**
