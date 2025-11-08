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

**Note:** The build will fail with a clear error message if any required variable is missing. See `docs/VERCEL_ENV_SETUP.md` for detailed setup instructions.

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

**⚠️ CRITICAL: Always test environment variables after deploying to Vercel!**

To verify environment variables are properly loaded at runtime (not just at build time), use the diagnostic API:

```bash
# Primary diagnostic endpoint (recommended)
curl https://yourdomain.vercel.app/api/env

# Alternative endpoint (same functionality)
curl https://yourdomain.vercel.app/api/env-check
```

#### What the Diagnostic API Returns:

```json
{
  "NODE_ENV": "production",
  "timestamp": "2025-11-08T20:49:31.041Z",
  "summary": {
    "total": 6,
    "present": 6,
    "missing": 0
  },
  "variables": {
    "NEXTAUTH_SECRET": { "present": true, "length": 44 },
    "NEXTAUTH_URL": { "present": true, "length": 35 },
    "GOOGLE_CLIENT_ID": { "present": true, "length": 72 },
    "GOOGLE_CLIENT_SECRET": { "present": true, "length": 35 },
    "DATABASE_URL": { "present": true, "length": 122 },
    "DATABASE_URL_UNPOOLED": { "present": true, "length": 117 },
    "NODE_ENV": { "present": true, "length": 10 }
  }
}
```

#### How to Use After Deployment:

1. **Deploy to Vercel** with environment variables set in Dashboard
2. **Test immediately** using the diagnostic endpoint:
   ```bash
   curl https://your-deployment-url.vercel.app/api/env
   ```
3. **Verify each variable** shows `"present": true`
4. **Check the summary** - `"missing"` should be `0`
5. **Look for warnings** - The API will warn about weak secrets or misconfigurations

#### Common Issues and Solutions:

| Issue | What It Means | Solution |
|-------|---------------|----------|
| `"present": false` | Variable not set in Vercel | Add in Vercel Dashboard → Settings → Environment Variables |
| `"length": 0` | Variable set but empty | Update the variable value in Vercel Dashboard |
| All variables missing | Wrong environment selected | Check if variables are enabled for Production/Preview in Vercel |
| NEXTAUTH_SECRET length < 32 | Weak secret (warning shown) | Generate new secret: `openssl rand -base64 32` |
| NEXTAUTH_URL contains "localhost" | Wrong URL in production | Update to production domain (e.g., https://yourdomain.vercel.app) |

**Security Note:** These endpoints never expose actual secret values - only presence (true/false) and length. Safe to use in production for debugging.

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

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details, and see `docs/VERCEL_ENV_SETUP.md` for environment variable setup instructions.
