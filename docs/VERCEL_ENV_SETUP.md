# Vercel Environment Variables Setup Guide

## Overview

This guide explains how to properly configure environment variables for the DuckSAT application on Vercel, particularly focusing on NextAuth secrets and database credentials.

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

The application now includes build-time validation:

- If `NEXTAUTH_SECRET` is missing in production, the build will **fail immediately** with a clear error message
- Debug logs will show environment variable status during startup
- Check build logs in Vercel for any environment-related warnings

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

## Environment Variable Checklist

Before deploying to production, ensure these are set in Vercel:

- [ ] `NEXTAUTH_SECRET` - Generated with `openssl rand -base64 32`
- [ ] `NEXTAUTH_URL` - Your application's production URL
- [ ] `GOOGLE_CLIENT_ID` - From Google Cloud Console
- [ ] `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- [ ] `DATABASE_URL` - Your database connection string
- [ ] `DATABASE_URL_UNPOOLED` - For migrations (if using connection pooling)

## Additional Resources

- [NextAuth.js Environment Variables](https://next-auth.js.org/configuration/options#environment-variables)
- [Vercel Environment Variables Documentation](https://vercel.com/docs/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/pages/building-your-application/configuring/environment-variables)

## Security Notes

1. **Never expose secrets in client-side code** - Only use `NEXT_PUBLIC_` prefix for non-sensitive variables
2. **Rotate secrets periodically** - Update `NEXTAUTH_SECRET` every few months (will invalidate sessions)
3. **Use different secrets for different projects** - Never reuse secrets across applications
4. **Monitor access logs** - Check Vercel deployment logs for unauthorized access attempts
