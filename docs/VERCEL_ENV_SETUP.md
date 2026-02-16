# Vercel Environment Variables Setup Guide

## Overview

This guide explains how to properly configure environment variables for the DuckSAT application on Vercel, particularly focusing on NextAuth secrets and database credentials.

**Important:** This project includes **automatic build-time validation** of all required environment variables. If any required variable is missing during deployment, the build will fail early with a clear error message, preventing deployment with misconfiguration.

## ⚠️ CRITICAL: Vercel UI is the ONLY Way to Set Runtime Variables

**Environment variables MUST be set in the Vercel Dashboard UI to be accessible at runtime.**

### Why This Matters

- **`.env` files are NOT deployed** to Vercel (they're in `.gitignore`)
- **Build scripts only affect build time**, not runtime
- **Only variables set in Vercel Dashboard UI** are available when your application runs on Vercel servers
- **Runtime failures WILL occur** if you forget to set variables in the UI, even if build succeeds

### Where to Set Variables

✅ **Correct:** Vercel Dashboard → Settings → Environment Variables  
❌ **Wrong:** `.env`, `.env.local`, `.env.production` files  
❌ **Wrong:** Build scripts or package.json scripts  
❌ **Wrong:** GitHub repository secrets (those are for CI/CD, not Vercel runtime)

## Critical Environment Variables

### NEXTAUTH_SECRET (Required)

The `NEXTAUTH_SECRET` is critical for securing sessions and must be set in production.

#### Generating a Secret

Use OpenSSL to generate a secure random secret:

```bash
openssl rand -base64 32
```

This will output a string like: `lrtH8Yr4JVwfLuVUQ9P1GJ17AROOQOoWnTy9HwO3dl8=`

#### Setting in Vercel Dashboard

1. Go to your project in Vercel
2. Navigate to **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name:** `NEXTAUTH_SECRET`
   - **Value:** Your generated secret from the command above
   - **Environment:** Select **Production**, **Preview**, and **Development** as needed
4. Click **Save**

### NEXTAUTH_URL (Required)

The canonical URL of your application.

- **Production:** `https://kiroducksat.vercel.app` (or your custom domain)
- **Preview:** Can use Vercel's preview URLs or set to match production
- **Development:** `http://localhost:3000`

### Google OAuth Credentials (Required for Authentication)

Set these in Vercel:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Get these from [Google Cloud Console](https://console.cloud.google.com/apis/credentials).

### Database Environment Variables (Required)

For Neon PostgreSQL (or your database provider):

- `DATABASE_URL` - Connection string with pgBouncer pooling
- `DATABASE_URL_UNPOOLED` - Direct connection string (for migrations)

### Azure OpenAI Configuration (Required for Question Generation)

**CRITICAL:** These variables are required for the question generation feature to work. If missing, you'll see a `500 Internal Server Error` with message: _"Missing Azure OpenAI config"_.

Set these in Vercel Dashboard → Settings → Environment Variables:

#### Option 1: Direct Endpoint URL (Recommended)
```
AZURE_OPENAI_API_KEY=your-azure-openai-api-key
ENDPOINT_URL=https://your-resource.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview
```

#### Option 2: Component Configuration
```
AZURE_OPENAI_API_KEY=your-azure-openai-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2025-01-01-preview
```

**Optional (for quality evaluation):**
```
GROK_ENDPOINT=https://your-grok-endpoint.openai.azure.com/...
```

**How to get these from Azure Portal:**

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure OpenAI Service**
3. Select your cognitive services resource
4. Go to **Keys and Endpoint** section:
   - Copy **Key 1** → `AZURE_OPENAI_API_KEY`
   - Copy **Endpoint** → `AZURE_OPENAI_ENDPOINT`
5. Go to **Model deployments** (or Azure OpenAI Studio):
   - Note your deployment name (e.g., `gpt-4o`) → `AZURE_OPENAI_DEPLOYMENT`

**Important Notes:**
- You must have an **Azure OpenAI deployment** (not just regular Azure)
- The deployment must have **GPT-4o** or similar model
- API version `2025-01-01-preview` is required for `max_completion_tokens` parameter
- These variables must be set in **all environments** (Production, Preview, Development)

## Best Practices

### 1. Never Commit Secrets to Git

The `.env` file is already in `.gitignore`. Keep it that way!

```gitignore
# In .gitignore
.env*
```

### 2. Use Different Secrets for Different Environments

- **Production:** Use a strong, unique secret
- **Preview:** Can use same as production or a different one
- **Development:** Can use a simpler secret (already handled via fallback)

### 3. Redeploy After Adding Environment Variables

After adding or updating environment variables in Vercel:

1. Navigate to **Deployments**
2. Find the latest deployment
3. Click the **⋯** menu → **Redeploy**
4. Confirm the redeploy

Or push a new commit to trigger automatic deployment.

### 4. Verify Environment Variables Are Loaded

#### Build-Time Validation

The application includes **comprehensive build-time validation** via `scripts/check-env.js`:

- **Automatic Validation:** Runs before every build (via the `prebuild` npm script)
- **All Required Variables Checked:** Validates presence of all 6 critical environment variables
- **Clear Logging:** Shows the presence and length of each variable (never the actual values)
- **Fail-Fast:** If any required variable is missing, the build fails immediately before Next.js build starts
- **Build Logs:** Check Vercel build logs to see the validation output and verify all variables are present

The validation output will appear in your build logs like this:
```
🔍 Environment Variable Validation
✅ NEXTAUTH_SECRET: present (length: 44)
✅ NEXTAUTH_URL: present (length: 30)
✅ GOOGLE_CLIENT_ID: present (length: 72)
✅ GOOGLE_CLIENT_SECRET: present (length: 35)
✅ DATABASE_URL: present (length: 122)
✅ DATABASE_URL_UNPOOLED: present (length: 117)
✅ All required environment variables are present!
```

If any variables are missing, you'll see:
```
❌ NEXTAUTH_SECRET: MISSING
🚨 Build cannot proceed with missing environment variables!
```

#### Runtime Verification (Diagnostic API)

To verify that environment variables are accessible at runtime on Vercel (not just at build time), use the **Runtime Diagnostic API**:

**Endpoint:** `GET /api/env-check`

**Usage:**
```bash
# Check your deployed app
curl https://yourdomain.vercel.app/api/env-check
```

**Response (Non-Production):**
```json
{
  "NODE_ENV": "development",
  "timestamp": "2025-11-08T14:30:00.000Z",
  "diagnosticsEnabled": true,
  "variables": {
    "NEXTAUTH_SECRET": { "present": true, "length": 44 },
    "NEXTAUTH_URL": { "present": true, "length": 30 },
    "GOOGLE_CLIENT_ID": { "present": true, "length": 72 },
    "GOOGLE_CLIENT_SECRET": { "present": true, "length": 35 },
    "DATABASE_URL": { "present": true, "length": 122 },
    "DATABASE_URL_UNPOOLED": { "present": true, "length": 117 }
  }
}
```

**Security Features:**
- ✅ Shows presence (`true`/`false`) and length for each variable
- ✅ Never exposes actual secret values
- ✅ Includes NODE_ENV and timestamp for context
- ✅ In production: Only returns data by default (no special access needed)
- ✅ For enhanced diagnostics in production: Set `ALLOW_ENV_DIAGNOSTICS=true` env var

**Important:** This API is designed for debugging environment variable issues. While it never exposes actual values, it's recommended to:
- Monitor access to this endpoint
- Remove `ALLOW_ENV_DIAGNOSTICS` after debugging is complete
- Use this endpoint during initial deployment verification

## Troubleshooting

### Error: "NEXTAUTH_SECRET environment variable must be set in production"

**Cause:** The `NEXTAUTH_SECRET` environment variable is not set or not accessible during build/runtime.

**Solution:**

1. Verify the variable is set in Vercel Dashboard → Settings → Environment Variables
2. Ensure it's enabled for the correct environment (Production/Preview)
3. Redeploy the application after adding the variable
4. Check build logs for the debug output showing environment status

### Environment Variables Not Loading

**Possible causes:**

1. **Wrong environment selected:** Make sure variables are enabled for Production/Preview/Development as needed
2. **Typo in variable name:** Double-check spelling (case-sensitive)
3. **Not redeployed:** Changes to environment variables require a redeploy

**How to verify:**

1. Check build logs in Vercel
2. Look for the `[NextAuth Config] Environment check:` log entry
3. Verify `NEXTAUTH_SECRET_present: true` in the logs

### Sessions Being Invalidated

If users are getting logged out frequently:

- Ensure `NEXTAUTH_SECRET` remains constant across deployments
- Never regenerate the secret unless you want to invalidate all sessions
- Make sure the same secret is used in all production deployments

### Error: "500 Internal Server Error" on Question Generation

**Symptom:** When trying to generate questions in the Admin panel, you see:
```
POST /api/admin/enhanced-generate-questions 500 (Internal Server Error)
```

**Cause:** Missing Azure OpenAI configuration environment variables.

**Solution:**

1. **Check if variables are set:** Go to Vercel Dashboard → Settings → Environment Variables
2. **Add missing variables:**
   - `AZURE_OPENAI_API_KEY` - Your Azure OpenAI API key
   - `ENDPOINT_URL` (or `AZURE_OPENAI_ENDPOINT`) - Your Azure OpenAI endpoint URL
3. **Verify deployment name (optional):**
   - `AZURE_OPENAI_DEPLOYMENT` - Should match your Azure deployment (defaults to `gpt-4o`)
4. **Select all environments:** Production, Preview, and Development
5. **Redeploy:** 
   - Go to Deployments tab
   - Click **⋯** on latest deployment → **Redeploy**
   - Wait 2-3 minutes for deployment to complete
6. **Test again:** Try generating questions

**How to verify fix worked:**
- Check Vercel deployment logs (Runtime Logs tab)
- Look for log entry: `✅ Database connection verified`
- If you still see errors, look for messages mentioning environment variables
- Browser console (F12) should no longer show 500 error

**Related error messages:**
- `"Missing Azure OpenAI config: set AZURE_OPENAI_API_KEY and ENDPOINT_URL or AZURE_OPENAI_ENDPOINT"`
- `"Failed to generate questions"`

**Prevention:** Always set Azure OpenAI variables before deploying question generation features.

## Environment Variable Checklist

Before deploying to production, ensure these are set in Vercel:

- [ ] `NEXTAUTH_SECRET` - Generated with `openssl rand -base64 32`
- [ ] `NEXTAUTH_URL` - Your application's production URL
- [ ] `GOOGLE_CLIENT_ID` - From Google Cloud Console
- [ ] `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- [ ] `DATABASE_URL` - Your database connection string
- [ ] `DATABASE_URL_UNPOOLED` - For migrations (if using connection pooling)
- [ ] `AZURE_OPENAI_API_KEY` - Azure OpenAI API key (**REQUIRED for question generation**)
- [ ] `ENDPOINT_URL` **OR** `AZURE_OPENAI_ENDPOINT` - Azure OpenAI endpoint (**REQUIRED**)
- [ ] `AZURE_OPENAI_DEPLOYMENT` - Model deployment name (optional, defaults to `gpt-4o`)
- [ ] `AZURE_OPENAI_API_VERSION` - API version (optional, defaults to `2025-01-01-preview`)
- [ ] `GROK_ENDPOINT` - Quality evaluation endpoint (optional, falls back to main endpoint)

**Note:** The build process will automatically validate all these variables and fail if any are missing, so you'll know immediately if configuration is incomplete.

## Additional Resources

- [NextAuth.js Environment Variables](https://next-auth.js.org/configuration/options#environment-variables)
- [Vercel Environment Variables Documentation](https://vercel.com/docs/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/pages/building-your-application/configuring/environment-variables)

## Security Notes

1. **Never expose secrets in client-side code** - Only use `NEXT_PUBLIC_` prefix for non-sensitive variables
2. **Rotate secrets periodically** - Update `NEXTAUTH_SECRET` every few months (will invalidate sessions)
3. **Use different secrets for different projects** - Never reuse secrets across applications
4. **Monitor access logs** - Check Vercel deployment logs for unauthorized access attempts
