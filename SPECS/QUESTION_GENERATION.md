# SAT Question Generation System - DuckSAT_CLEAN

## Overview

This is a **hybrid question generation system** that combines:
- **Python backend** (`sat_unified_generator_v4.py`) - Azure OpenAI-powered generation with comprehensive validation
- **TypeScript frontend** (`generate-questions.ts`) - Database integration and pipeline management
- **PostgreSQL storage** - Questions exported to Prisma schema

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  TypeScript CLI (generate-questions.ts)         │
│  - User interface                                               │
│  - Database integration                                         │
│  - Image storage management                                     │
└──────────┬──────────────────────────────────────────────────────┘
           │
           ├─ Calls Python generator
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│        Python Generator (sat_unified_generator_v4.py)           │
│  6-Step Pipeline:                                               │
│  1️⃣  Generate raw questions (Azure OpenAI)                     │
│  2️⃣  Validate structure & fields                               │
│  3️⃣  Generate diagrams (matplotlib)                            │
│  4️⃣  Validate quality (AI review)                              │
│  5️⃣  Export to JSON (Prisma-compatible)                        │
│  6️⃣  Save timestamped files                                    │
└──────────┬──────────────────────────────────────────────────────┘
           │
           ├─ Generated files (JSON with base64 images)
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                 PostgreSQL (Prisma ORM)                        │
│  - Questions table with full schema                             │
│  - Image data storage                                           │
│  - Subtopic/Topic relationships                                 │
│  - Review status tracking                                       │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│              Practice Tests (useTestState hook)                 │
│  - Questions fetched from database                              │
│  - Full support for all question types                          │
│  - LaTeX math rendering                                         │
│  - Image/diagram display                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Question Types Supported

### Math (5 types)
- **Equations** - Algebra, linear/quadratic/radical equations
- **Geometry** - Triangles, circles, angles, coordinates (with diagrams)
- **WordProblems** - Rates, percentages, mixtures, distance
- **Functions** - Linear, quadratic, exponential, piecewise
- **Data** - Statistics, probability, distributions (with charts)

### Reading & Writing (5 types)
- **FillInBlank** - Vocabulary and grammar in context
- **Details** - Reading comprehension questions
- **Summary** - Main idea and main purpose questions
- **PassageDiagram** - Passage + data visualization questions
- **Research** - Claims analysis and evidence support questions

## Quick Start

### 1. Setup Environment

```bash
# Copy environment variables
cp ../.env .env

# Verify these are set:
# - AZURE_OPENAI_ENDPOINT
# - AZURE_OPENAI_API_KEY
# - AZURE_OPENAI_DEPLOYMENT
# - DATABASE_URL
```

### 2. Generate Questions

```bash
# Generate 1 question of each type (10 total)
npm run generate:questions

# Generate 5 math questions only
npm run generate:questions:math -- --num-per-type 5

# Generate 3 reading questions only
npm run generate:questions:reading -- --num-per-type 3

# Generate specific type (Geometry)
npm run generate:questions -- --type Geometry --num-per-type 2
```

### 3. Review Generated Questions

Questions are saved to `generated-questions/` directory:
- `generated_questions_YYYYMMDD_HHMMSS.json` - All questions with stats
- `Geometry_YYYYMMDD_HHMMSS.json` - Questions by type
- Each file contains full metadata, validation scores, and base64 images

### 4. Import to Database

```bash
# Import latest generated questions to database
npm run generate:questions:import

# Or manually:
npm run generate:questions -- --import
```

## Usage Examples

### Generate 10 Geometry questions with auto-import
```bash
npm run generate:questions -- --type Geometry --num-per-type 10 --import
```

### Generate 5 of each math type
```bash
npm run generate:questions:math -- --num-per-type 5
```

### Generate all question types (1 each)
```bash
npm run generate:questions
```

### Generate 50 reading questions and import
```bash
npm run generate:questions:reading -- --num-per-type 25 --import
```

## Generated Question Format (JSON)

```json
{
  "id": null,
  "moduleType": "math",
  "difficulty": "medium",
  "category": "Geometry",
  "subtopic": "geometric-properties",
  "question": "In triangle ABC, if ∠A = 60° and ∠B = 80°, what is ∠C?",
  "passage": null,
  "options": [
    "A) 40°",
    "B) 50°",
    "C) 60°",
    "D) 80°"
  ],
  "correctAnswer": 0,
  "explanation": "The sum of angles in a triangle is 180°. Therefore, ∠C = 180° - 60° - 80° = 40°.",
  "wrongAnswerExplanations": {},
  "imageUrl": null,
  "imageData": <base64-encoded-png>,
  "imageMimeType": "image/png",
  "imageAlt": "Triangle ABC with angles labeled",
  "chartData": {
    "description": "Triangle ABC with angles labeled: A=60°, B=80°, C=?",
    "hasImage": true
  },
  "timeEstimate": 60,
  "source": "ai-generated-v4",
  "tags": ["math", "geometry", "medium"],
  "isActive": true,
  "reviewStatus": "approved",
  "reviewRating": 9,
  "createdAt": "2026-01-16T12:34:56.000Z",
  "_metadata": {
    "generatedAt": "2026-01-16T12:34:56.000Z",
    "validation": {
      "isValid": true,
      "qualityScore": 9,
      "recommendation": "approve"
    },
    "questionType": "Geometry",
    "hasDiagram": true
  }
}
```

## Quality Validation

Each generated question goes through 4 validation checks:

1. **Structure Validation**
   - Required fields present (question, choices, answer, explanation)
   - Exactly 4 answer choices
   - Correct answer in A-D format
   - Proper choice formatting

2. **Content Validation**
   - LaTeX math notation properly formatted
   - Choice options are distinct and plausible
   - Question is solvable with given information

3. **Quality Scoring**
   - Clarity and readability (1-10)
   - Difficulty appropriateness (1-10)
   - Distractor effectiveness (1-10)
   - Average score determines approval threshold (≥7/10)

4. **Diagram Validation** (for Geometry/Data types)
   - Diagram matches problem description
   - Geometric relationships are accurate
   - All mentioned elements are present
   - Clear labels and formatting

## Database Integration

Questions are automatically stored in the Prisma Question model with:
- Topic/Subtopic relationships
- Review status tracking (pending/approved/rejected)
- Image data as BLOB (binary storage)
- Full metadata preservation
- Active status for filtering

### Database Schema (Relevant Fields)

```prisma
model Question {
  id                    String      @id @default(cuid())
  subtopicId           String?
  moduleType           String      // 'math' | 'reading-writing'
  difficulty           String      // 'easy' | 'medium' | 'hard'
  category             String      // Topic category
  subtopic             String?     // Specific subtopic
  question             String      @db.Text
  passage              String?     @db.Text
  options              Json        // Array of 4 choices
  correctAnswer        Int         // 0-3 index
  explanation          String      @db.Text
  wrongAnswerExplanations Json?
  imageData            Bytes?      // PNG/SVG image blob
  imageMimeType        String?     // 'image/png' or 'image/svg+xml'
  imageAlt             String?
  chartData            Json?       // Chart configuration
  timeEstimate         Int         // Seconds
  source               String?
  tags                 String[]
  isActive             Boolean     @default(true)
  reviewStatus         String?     // 'pending' | 'approved' | 'rejected'
  reviewRating         Int?        // 1-10
  reviewComments       String?     @db.Text
  
  // Relations
  subtopicRef          Subtopic?   @relation(fields: [subtopicId], references: [id])
  questionResults      QuestionResult[]
  questionReviews      QuestionReview[]
}
```

## Practice Test Integration

Generated questions are immediately available in practice tests:

1. Questions are fetched from database by subtopic/difficulty
2. All question types are fully supported
3. Math rendering via MathRenderer component (LaTeX → HTML)
4. Images/diagrams displayed via imageUrl or imageData
5. Timer per question (timeEstimate field)
6. Answer validation and explanation display

## Troubleshooting

### Python Dependencies
```bash
# Install required Python packages
pip install python-dotenv openai matplotlib numpy

# Or use requirements.txt
pip install -r requirements.txt
```

### Azure OpenAI Connection
```bash
# Test connection
python -c "from openai import AzureOpenAI; print('✅ OpenAI library working')"

# Verify environment variables
echo $AZURE_OPENAI_ENDPOINT
echo $AZURE_OPENAI_API_KEY
echo $AZURE_OPENAI_DEPLOYMENT
```

### Database Connection
```bash
# Test Prisma connection
npx prisma db execute --stdin <<< "SELECT 1"

# View database schema
npm run db:studio
```

### Image Generation Issues
If diagrams fail to generate:
1. Check Python matplotlib installation: `python -c "import matplotlib; print('✅')"
2. Review generated JSON files for `_metadata.hasDiagram` field
3. Check `reviewStatus` and `reviewComments` for quality issues
4. Re-run generator with more verbose logging

## Performance Notes

- Each question takes ~30-60 seconds to generate (API calls + validation)
- Batch generation recommended: `--num-per-type 5` to `--num-per-type 25`
- Database import is fast (~100 questions/min)
- Images stored as base64 in JSON, converted to BLOB in database
- Database queries optimized with indexes on moduleType, category, subtopic

## API References

### Python Generator
```bash
python scripts/sat_unified_generator_v4.py \
  --num-per-type 5 \
  --math-only \
  --output-dir generated-questions
```

### TypeScript Wrapper
```bash
tsx scripts/generate-questions.ts \
  --num-per-type 5 \
  --type Geometry \
  --import
```

## File Structure

```
DuckSAT_CLEAN/
├── scripts/
│   ├── sat_unified_generator_v4.py  ← Python generator (6-step pipeline)
│   ├── generate-questions.ts        ← TypeScript CLI wrapper
│   └── ... (other scripts)
├── generated-questions/             ← Output directory (auto-created)
│   ├── generated_questions_20260116_123456.json
│   ├── Geometry_20260116_123456.json
│   └── ... (by-type exports)
├── .env                            ← Azure/DB credentials
└── package.json                    ← npm scripts

DuckSAT/
├── prisma/
│   └── schema.prisma               ← Database schema (Subtopic/Question models)
└── src/
    └── app/practice-test/          ← Practice test page (uses questions from DB)
```

## Future Enhancements

- [ ] Batch processing optimization (parallel generation)
- [ ] Custom question templates per subtopic
- [ ] A/B testing for distractors
- [ ] Difficulty calibration based on performance data
- [ ] Automatic image optimization and caching
- [ ] Question deduplication across batches
- [ ] Bulk question review dashboard
- [ ] Export to SAT/ACT standardized formats

## Support & Debugging

For issues, check:
1. Environment variables in `.env` file
2. Python package installation: `pip list | grep openai`
3. Database connectivity: `npm run db:studio`
4. Generated JSON files in `generated-questions/` directory
5. Browser console for rendering errors in practice tests
6. Server logs for API errors

---

**Last Updated:** January 16, 2026
**Version:** 4.0 (Hybrid Python + TypeScript)
**Status:** ✅ Production Ready
