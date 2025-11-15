This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Prerequisites

Before running the application, ensure all required environment variables are set. The build process includes automatic validation that checks for:

- `NEXTAUTH_SECRET` - Authentication secret (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Application URL
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `DATABASE_URL` - Database connection string (pooled)
- `DATABASE_URL_UNPOOLED` - Database connection string (direct)

**Note:** The build will fail with a clear error message if any required variable is missing. 

**Quick Start:**
1. Copy `.env.example` to `.env.local` and fill in values
2. See `docs/VERCEL_ENV_SETUP.md` for detailed setup instructions
3. See `docs/DEPLOYMENT_GUIDE.md` for full deployment guide

### ⚠️ CRITICAL: Vercel Runtime Environment Variables

**For Vercel deployments, environment variables MUST be set in the Vercel Dashboard UI to be available at runtime.**

Setting variables only in `.env` files or build scripts will NOT make them available at runtime on Vercel. Follow these steps:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each required variable:
   - `NEXTAUTH_SECRET` (generate with: `openssl rand -base64 32`)
   - `NEXTAUTH_URL` (your production URL, e.g., `https://yourdomain.vercel.app`)
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `DATABASE_URL`
   - `DATABASE_URL_UNPOOLED`
4. Select the appropriate environments (Production, Preview, Development)
5. **Redeploy** your application after adding/updating variables

**Important:** Variables set in the Vercel UI are the ONLY way to make them accessible at runtime. Build-time validation will catch missing variables, but runtime failures will occur if variables aren't set in the Vercel Dashboard.

For detailed setup instructions and troubleshooting, see `docs/VERCEL_ENV_SETUP.md`.

### Runtime Environment Diagnostics

To verify environment variables are properly loaded at runtime, you can use the diagnostic API:

```bash
# Check environment variable presence and length
curl https://yourdomain.vercel.app/api/env-check
```

This endpoint returns presence (true/false) and length for all required variables, plus NODE_ENV. It never exposes actual secret values.

### Running the Development Server

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Environment Variable Validation

This project includes **build-time environment variable validation** to prevent deployment with missing configuration. 

- **Automatic Check:** Before each build, `scripts/check-env.js` validates all required environment variables
- **Fail-Fast:** If any required variable is missing, the build fails immediately with a clear error message
- **Security:** Variable presence and length are logged, but actual values are never exposed
- **Local Development:** The validation runs in local builds too, showing you immediately if any configuration is missing

To see the validation in action, run:
```bash
npm run build
```

The prebuild script will display the status of all required environment variables before the Next.js build begins.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

**Important:** Before deploying, ensure all required environment variables are configured in Vercel Dashboard → Settings → Environment Variables. The build will fail if any are missing.

### Deployment Resources

- **Step-by-step deployment guide**: See `docs/DEPLOYMENT_GUIDE.md`
- **Environment setup**: See `docs/VERCEL_ENV_SETUP.md`
- **Image storage system**: See `docs/IMAGE_STORAGE.md`
- **Next.js deployment docs**: [Official Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying)

### Post-Deployment Setup

After your first deployment:

1. **Run database migrations**:
   ```bash
   npx prisma migrate deploy
   ```

2. **Migrate existing images** (if applicable):
   ```bash
   npm run db:migrate-images
   ```

3. **Verify deployment**:
   - Visit `/api/env-check` to confirm environment variables
   - Test authentication at `/admin`
   - Check image loading on question pages

## Admin Features

### AI Question Generation

DuckSAT includes powerful AI-powered question generation capabilities:

- **Web UI**: Generate questions through the admin dashboard at `/admin/question-generation`
- **Batch Script**: Automated batch generation using `run-generation-enhanced.js`

#### Using the Batch Generation Script

The enhanced batch generation script provides automated, robust question generation with:
- Configurable batch sizes and counts
- Automatic retry logic
- Progress tracking and statistics
- API key authentication for CI/CD

**Quick Start:**
```bash
# Generate 10 questions locally
node run-generation-enhanced.js

# Generate 30 math questions across 3 batches
MODULE_TYPE=math QUESTION_COUNT=10 BATCH_COUNT=3 node run-generation-enhanced.js
```

**For detailed documentation:**
- See `BATCH_GENERATION_GUIDE.md` for complete usage guide
- See `ADMIN_QUESTION_GENERATION.md` for web UI documentation
- See `.env.generation.example` for configuration options

**Key Features:**
- Environment-based configuration
- Session or API key authentication
- Automatic error handling and retries
- Real-time progress tracking
- Comprehensive statistics and reporting
- Support for topic/subtopic filtering
- Configurable AI parameters (temperature, max tokens)

#### API Endpoints

The system provides two admin API endpoints:
- `/api/admin/enhanced-generate-questions` - Main generation endpoint
- `/api/admin/batch-adapter` - Lightweight adapter with API key support

Both endpoints support:
- NextAuth session authentication
- API key authentication (set `ADMIN_API_KEYS` in `.env`)
- Topic/subtopic filtering
- Difficulty level selection
- Module type filtering (Math/Reading)
