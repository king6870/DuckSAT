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

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with initial data
- `npm run db:studio` - Open Prisma Studio
- `npm run db:import` - Import generated questions from JSON
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
