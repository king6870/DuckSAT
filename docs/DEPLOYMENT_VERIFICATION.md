# Deployment Verification Guide

This guide provides step-by-step instructions for verifying that your DuckSAT application is correctly deployed to Vercel with all required environment variables properly configured.

## Pre-Deployment Checklist

Before deploying to Vercel, ensure you have:

- [ ] Created a Vercel account and linked your GitHub repository
- [ ] Generated a secure NEXTAUTH_SECRET: `openssl rand -base64 32`
- [ ] Set up Google OAuth credentials in Google Cloud Console
- [ ] Prepared your database connection strings (pooled and unpooled)
- [ ] Read `docs/VERCEL_ENV_SETUP.md` for detailed environment variable setup

## Step 1: Configure Environment Variables in Vercel

**⚠️ CRITICAL: This is the ONLY way to set runtime environment variables on Vercel!**

1. **Navigate to Vercel Dashboard**
   - Go to https://vercel.com/dashboard
   - Select your DuckSAT project

2. **Open Environment Variables Settings**
   - Click on **Settings** tab
   - Click on **Environment Variables** in the sidebar

3. **Add Each Required Variable**

   For each variable below, click "Add New" and enter:

   | Variable Name | Description | Where to Get It | Example Value |
   |--------------|-------------|-----------------|---------------|
   | `NEXTAUTH_SECRET` | Session encryption key | Generate: `openssl rand -base64 32` | `lrtH8Yr4JVwfLuVUQ9P1GJ17AROOQOoWnTy9HwO3dl8=` |
   | `NEXTAUTH_URL` | Your app's canonical URL | Your Vercel deployment URL | `https://yourdomain.vercel.app` |
   | `GOOGLE_CLIENT_ID` | Google OAuth client ID | Google Cloud Console | `123456789-abc...xyz.apps.googleusercontent.com` |
   | `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Google Cloud Console | `GOCSPX-abc...xyz` |
   | `DATABASE_URL` | Database connection (pooled) | Your database provider | `postgresql://user:pass@host/db?pgbouncer=true` |
   | `DATABASE_URL_UNPOOLED` | Database connection (direct) | Your database provider | `postgresql://user:pass@host/db` |

4. **Select Target Environments**
   - For each variable, check:
     - ✅ **Production** (required for production deployments)
     - ✅ **Preview** (optional, recommended for PR previews)
     - ⬜ **Development** (optional, use .env.local for local development)

5. **Save All Variables**
   - Click "Save" after adding each variable
   - Verify all 6 required variables are listed

## Step 2: Deploy to Vercel

### Option A: Deploy via Git Push (Recommended)

```bash
# Commit your changes
git add .
git commit -m "Configure for Vercel deployment"

# Push to main branch (or create a PR)
git push origin main
```

Vercel will automatically detect the push and start a deployment.

### Option B: Manual Deploy via Vercel Dashboard

1. Go to your project in Vercel Dashboard
2. Click on the **Deployments** tab
3. Click **Deploy** button
4. Select the branch to deploy

## Step 3: Monitor the Build Process

1. **Open the Build Log**
   - Click on the deployment in progress
   - View the build logs in real-time

2. **Check for Environment Variable Validation**
   
   Look for this output from `scripts/check-env.js`:
   ```
   🔍 Environment Variable Validation
   ✅ NEXTAUTH_SECRET: present (length: 44)
   ✅ NEXTAUTH_URL: present (length: 35)
   ✅ GOOGLE_CLIENT_ID: present (length: 72)
   ✅ GOOGLE_CLIENT_SECRET: present (length: 35)
   ✅ DATABASE_URL: present (length: 122)
   ✅ DATABASE_URL_UNPOOLED: present (length: 117)
   ✅ All required environment variables are present!
   ```

3. **Build Status**
   - ✅ **Success:** Build completed without errors → Proceed to Step 4
   - ❌ **Failed:** Check error messages → Fix issues → Redeploy

### Common Build Errors

| Error Message | Cause | Solution |
|--------------|-------|----------|
| "NEXTAUTH_SECRET: MISSING" | Variable not set in Vercel | Add to Vercel Dashboard → Redeploy |
| "Build cannot proceed with missing environment variables" | One or more variables missing | Review all 6 variables in Vercel Dashboard |
| "Authentication failed" | Database connection issue | Verify DATABASE_URL and DATABASE_URL_UNPOOLED |

## Step 4: Verify Runtime Environment Variables

**⚠️ CRITICAL STEP: Build success ≠ Runtime success!**

Even if the build succeeds, you must verify that variables are accessible at runtime.

### 4.1 Get Your Deployment URL

After successful deployment, copy your deployment URL:
- Production: `https://yourdomain.vercel.app`
- Preview: `https://your-project-git-branch-yourusername.vercel.app`

### 4.2 Run the Diagnostic Check

```bash
# Replace with your actual deployment URL
curl https://your-deployment-url.vercel.app/api/env
```

**Or with jq for prettier output:**
```bash
curl https://your-deployment-url.vercel.app/api/env | jq
```

### 4.3 Analyze the Response

**✅ Success Response:**
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
    "DATABASE_URL_UNPOOLED": { "present": true, "length": 117 }
  }
}
```

**Verification Checklist:**
- [ ] `summary.missing` equals `0`
- [ ] All variables show `"present": true`
- [ ] `NEXTAUTH_SECRET` length is ≥ 32 characters
- [ ] `NEXTAUTH_URL` does NOT contain "localhost"
- [ ] `NODE_ENV` is `"production"` for production deployments
- [ ] No warnings array, or all warnings are addressed

**❌ Failure Response Example:**
```json
{
  "NODE_ENV": "production",
  "timestamp": "2025-11-08T20:49:31.041Z",
  "summary": {
    "total": 6,
    "present": 4,
    "missing": 2
  },
  "variables": {
    "NEXTAUTH_SECRET": { "present": false, "length": 0 },
    "NEXTAUTH_URL": { "present": false, "length": 0 },
    "GOOGLE_CLIENT_ID": { "present": true, "length": 72 },
    "GOOGLE_CLIENT_SECRET": { "present": true, "length": 35 },
    "DATABASE_URL": { "present": true, "length": 122 },
    "DATABASE_URL_UNPOOLED": { "present": true, "length": 117 }
  },
  "warnings": [
    "NEXTAUTH_SECRET is not set or is empty",
    "NEXTAUTH_URL is not set or is empty",
    "CRITICAL: Missing environment variables in production!"
  ]
}
```

**If You See Missing Variables:**
1. Go back to Vercel Dashboard → Settings → Environment Variables
2. Add the missing variables
3. Ensure they're enabled for the correct environment
4. **MUST Redeploy** for changes to take effect
5. Run diagnostic check again

## Step 5: Test Authentication Flow

1. **Access Your Application**
   ```bash
   open https://your-deployment-url.vercel.app
   ```

2. **Test Sign In**
   - Click "Sign In" or navigate to `/auth/signin`
   - Try signing in with Google
   - Verify successful authentication

3. **Common Authentication Issues**

   | Issue | Diagnostic Result | Solution |
   |-------|------------------|----------|
   | "Configuration error" | NEXTAUTH_SECRET missing | Add variable → Redeploy |
   | "Redirect URI mismatch" | NEXTAUTH_URL incorrect | Update to match actual domain |
   | "Invalid client" | GOOGLE_CLIENT_ID wrong | Verify in Google Cloud Console |
   | "Callback error" | OAuth redirect not configured | Add authorized redirect URI in Google Console |

## Step 6: Monitor Application Logs

1. **Access Vercel Logs**
   - Go to your project in Vercel Dashboard
   - Click on **Logs** tab
   - Filter by Function Logs

2. **Look for NextAuth Debug Output**
   
   In development or when variables are missing, you'll see:
   ```
   [NextAuth Config] Environment check: {
     NODE_ENV: 'production',
     NEXTAUTH_SECRET_present: true,
     NEXTAUTH_SECRET_length: 44,
     NEXTAUTH_URL_present: true,
     NEXTAUTH_URL_length: 35
   }
   ```

3. **Monitor for Runtime Errors**
   - Watch for authentication-related errors
   - Check database connection errors
   - Monitor API route errors

## Step 7: Post-Deployment Security Check

1. **Verify Secret Security**
   ```bash
   # This should NEVER show actual secret values
   curl https://your-deployment-url.vercel.app/api/env | grep -i "value"
   ```
   Expected: No output (values are never exposed)

2. **Test that .env Files Weren't Deployed**
   - .env and .env.local should be in .gitignore
   - Only Vercel Dashboard variables should be active

3. **Verify Build-Time Validation**
   - Check that build fails if variables are removed
   - Test by temporarily removing a variable in Vercel → should fail build

## Troubleshooting Guide

### Issue: Build Succeeds but Runtime Fails

**Symptoms:**
- Build logs show all variables present
- Runtime diagnostic shows variables missing
- Application fails with "NEXTAUTH_SECRET is not set"

**Cause:** Variables only set for build, not for runtime

**Solution:**
1. Verify variables are in Vercel Dashboard (not just .env files)
2. Check that variables are enabled for "Production" environment
3. Redeploy after confirming settings

### Issue: Variables Keep Getting Lost

**Symptoms:**
- Variables work initially but disappear later
- Need to re-add variables frequently

**Possible Causes:**
1. **Multiple environments:** Variables set for Preview but not Production
2. **Project settings:** Variables accidentally deleted
3. **Team sync issues:** Team member removed variables

**Solution:**
- Set variables for all environments (Production, Preview)
- Document all required variables
- Use team permissions to prevent accidental changes

### Issue: Can't Access Diagnostic Endpoint

**Symptoms:**
- `curl https://your-url.vercel.app/api/env` returns 404 or 500

**Possible Causes:**
1. Endpoint not deployed (old build)
2. Route file missing
3. Build/deployment failed

**Solution:**
1. Check that `src/app/api/env/route.ts` exists
2. Verify build completed successfully
3. Check deployment logs for errors
4. Try alternative endpoint: `/api/env-check`

## Maintenance and Best Practices

### Regular Security Audits

- [ ] Review environment variables monthly
- [ ] Rotate NEXTAUTH_SECRET every 6 months
- [ ] Monitor access logs for diagnostic endpoints
- [ ] Keep OAuth credentials up to date

### Documentation

- [ ] Keep this guide updated as deployment process changes
- [ ] Document any custom environment variables added
- [ ] Share with team members who handle deployments

### Monitoring

- [ ] Set up Vercel deployment notifications
- [ ] Monitor error rates after deployments
- [ ] Check build times for anomalies
- [ ] Review runtime logs weekly

## Additional Resources

- [Vercel Environment Variables Documentation](https://vercel.com/docs/projects/environment-variables)
- [NextAuth.js Environment Variables](https://next-auth.js.org/configuration/options#environment-variables)
- [Google OAuth Setup Guide](https://console.cloud.google.com/apis/credentials)
- [DuckSAT Vercel Setup Guide](./VERCEL_ENV_SETUP.md)
- [DuckSAT README](../README.md)

## Quick Reference Commands

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Test diagnostic endpoint
curl https://your-url.vercel.app/api/env | jq

# Check specific variable
curl https://your-url.vercel.app/api/env | jq '.variables.NEXTAUTH_SECRET'

# Monitor deployment
vercel logs your-deployment-url

# Local development
npm run dev

# Build locally to test
npm run build
```

---

**Last Updated:** 2025-11-08  
**Version:** 1.0  
**Maintainer:** DuckSAT Development Team
