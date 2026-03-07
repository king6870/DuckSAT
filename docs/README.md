# DuckSAT

A Next.js SAT practice test application with AI-powered question generation.

## Quick Start

### 1. Environment Setup
```bash
# Copy example environment file
cp .env.example .env.local

# Required variables:
# - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)
# - NEXTAUTH_URL
# - GOOGLE_CLIENT_ID
# - GOOGLE_CLIENT_SECRET
# - DATABASE_URL
# - DATABASE_URL_UNPOOLED
```

### 2. Installation
```bash
npm install
```

### 3. Database Setup
```bash
npm run db:migrate
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Question Generation

Use the streamlined Jupyter notebook for AI-powered SAT question generation:

**File:** `question_generation_streamlined.ipynb`

**5-Cell Workflow:**
1. **Prep** - Install packages, configure Azure OpenAI
2. **LLM #1** - Generate SAT question with diagram description
3. **LLM #2** - Create Vega-Lite diagram from description
4. **LLM #3** - Quality check and validation
5. **Export** - Show stats and export to `generated-questions/`

**Run cells 1→2→3→4→5 in order.**

## Question Import System

Import generated questions into the database with 3 simple commands:

```bash
npm run questions:organize   # Organize export files into structured folders
npm run questions:import     # Import questions to database
npm run questions:verify     # Verify import succeeded
```

**Complete Guide:** See [USAGE_GUIDE.md](USAGE_GUIDE.md) for detailed instructions.

**Documentation:**
- [Usage Guide](USAGE_GUIDE.md) - Step-by-step workflows
- [Scripts Documentation](scripts/README.md) - Technical details
- [Full Specification](SPECS/QUESTION_IMPORT_SPEC.md) - Complete system design

## LaTeX Rendering System

**Status:** ✅ **Production Ready** (100% validation pass - 173 expressions)

DuckSAT uses a normalized LaTeX storage approach optimized for KaTeX browser rendering:

**Core Principle:** "One backslash in, one backslash out"
- Database stores: `$\frac{1}{2}$`
- JSON.stringify doubles: `\\frac` (for JSON transport)
- Browser parse halves: `\frac` (back to LaTeX)
- KaTeX renders: Formatted math

**Normalization Library:** `scripts/lib/normalize-latex.ts`
- Remove control characters (TAB, CR, NULL, etc.)
- Collapse multiple backslashes to single
- Remove `\newline` commands
- Validate with KaTeX parser

**Implementation:**
1. **Python Generators** (`azuredev-038d-main/sat_generator_v2.py`, `sat_generator_v3.py`)
   - Normalize LaTeX at question generation time
2. **Import Scripts** (`scripts/import-new-batch-questions.ts`)
   - Normalize LaTeX before database write
3. **HTML Export** (`scripts/export-all-questions-html.ts`)
   - Use KaTeX auto-render only (no client-side wrapping)
4. **Database Migration** (`scripts/migrate-latex-final.ts`)
   - One-time migration completed (backup: `backup-pre-migration.json`)

**Validation:** `npm run validate:latex` (runs `scripts/validate-latex-final.ts`)

**Results:**
```
Questions checked: 450
LaTeX expressions: 173
Valid: 173 (100%)
Invalid: 0
```

## Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

### Database
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with initial data
- `npm run db:studio` - Open Prisma Studio

### Question Management
- `npm run questions:organize` - Organize export questions into folders
- `npm run questions:import` - Import organized questions to database
- `npm run questions:verify` - Verify imported questions
- `npm run db:import` - Import generated questions from JSON (legacy)
- `npm run generate:questions` - Bulk generate questions (TypeScript)
- `npm run generate:images` - Generate images for existing questions

## Deployment

Deploy to Vercel:
1. Push code to GitHub
2. Import project in Vercel
3. Set environment variables in Vercel Dashboard → Settings → Environment Variables
4. Deploy

See `docs/DEPLOYMENT_GUIDE.md` and `docs/VERCEL_ENV_SETUP.md` for details.

## Admin Features

Access admin panel at `/admin` for:
- Question generation and management
- Question review system
- User progress tracking
