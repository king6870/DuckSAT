# Testing Guide: Environment Variable Diagnostics

This guide explains how to test the new `/api/env` diagnostic endpoint after deployment to Vercel.

## What Was Added

### 1. New Diagnostic API Route: `/api/env`
- **Location**: `src/app/api/env/route.ts`
- **Purpose**: Verify environment variables are loaded correctly at runtime on Vercel
- **Features**:
  - Shows summary of total/present/missing variables
  - Provides warnings for common misconfigurations
  - Never exposes actual secret values (only presence and length)

### 2. Enhanced Documentation
- **README.md**: Added detailed diagnostic testing instructions
- **docs/VERCEL_ENV_SETUP.md**: Enhanced with post-deployment verification
- **docs/DEPLOYMENT_VERIFICATION.md**: New comprehensive deployment guide
- **.env.example**: Reference file with all required variables

### 3. Security Improvements
- Added security warnings to `next.config.js`
- Enhanced documentation in `src/lib/auth.ts`
- Added security notes to `src/app/api/auth/[...nextauth]/route.ts`

## How to Test After Deployment

### Prerequisites
- Application deployed to Vercel
- All environment variables set in Vercel Dashboard
- `curl` or a web browser for testing

### Step 1: Deploy to Vercel

If not already deployed, deploy your application:

```bash
# Option A: Push to trigger automatic deployment
git push origin fix-nextauth-secret-diagnostics

# Option B: Manual deployment via Vercel Dashboard
# Go to Vercel Dashboard → Your Project → Deployments → Deploy
```

### Step 2: Wait for Deployment to Complete

1. Go to Vercel Dashboard
2. Navigate to your project
3. Click on **Deployments** tab
4. Wait for the deployment status to show "Ready"
5. Copy your deployment URL (e.g., `https://yourdomain.vercel.app`)

### Step 3: Test the Diagnostic Endpoint

Run the following command (replace with your actual URL):

```bash
# Basic test
curl https://yourdomain.vercel.app/api/env

# Pretty-printed output (requires jq)
curl https://yourdomain.vercel.app/api/env | jq

# Or open in browser
open https://yourdomain.vercel.app/api/env
```

### Step 4: Verify the Response

**Expected Response (All Variables Present):**

```json
{
  "NODE_ENV": "production",
  "timestamp": "2025-11-08T21:00:00.000Z",
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

**Verification Checklist:**
- [ ] `summary.missing` equals `0`
- [ ] All 6 critical variables show `"present": true`
- [ ] `NEXTAUTH_SECRET` length is ≥ 32 characters (typically 44 for base64)
- [ ] `NEXTAUTH_URL` length matches your domain (not localhost)
- [ ] `NODE_ENV` is `"production"`
- [ ] No `warnings` array in response (or warnings are addressed)

### Step 5: Test Authentication

After verifying environment variables, test that authentication works:

1. Navigate to your application: `https://yourdomain.vercel.app`
2. Click "Sign In" or navigate to `/auth/signin`
3. Try signing in with Google OAuth
4. Verify successful authentication and redirect

### Common Issues and Solutions

#### Issue 1: Variables Show as Missing

**Response Example:**
```json
{
  "summary": { "missing": 2 },
  "variables": {
    "NEXTAUTH_SECRET": { "present": false, "length": 0 },
    "NEXTAUTH_URL": { "present": false, "length": 0 }
  },
  "warnings": [
    "NEXTAUTH_SECRET is not set or is empty",
    "CRITICAL: Missing environment variables in production!"
  ]
}
```

**Solution:**
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add the missing variables
3. Ensure they're enabled for "Production" environment
4. **Redeploy** the application (required for changes to take effect)
5. Test again

#### Issue 2: Weak Secret Warning

**Response Example:**
```json
{
  "warnings": [
    "WARNING: NEXTAUTH_SECRET appears short (< 32 chars)"
  ]
}
```

**Solution:**
1. Generate a new secret: `openssl rand -base64 32`
2. Update in Vercel Dashboard → Settings → Environment Variables
3. Redeploy
4. Test again

**Note:** Changing NEXTAUTH_SECRET will invalidate all existing sessions.

#### Issue 3: Localhost URL in Production

**Response Example:**
```json
{
  "warnings": [
    "WARNING: NEXTAUTH_URL contains 'localhost' in production"
  ]
}
```

**Solution:**
1. Update NEXTAUTH_URL in Vercel Dashboard
2. Set to production domain: `https://yourdomain.vercel.app`
3. Redeploy
4. Test again

#### Issue 4: 404 Error on /api/env

**Symptoms:**
```
404 | This page could not be found.
```

**Possible Causes:**
- Build failed and new route wasn't deployed
- Deployment is using old code
- Route file missing from deployment

**Solution:**
1. Check Vercel deployment logs for errors
2. Verify `src/app/api/env/route.ts` exists in your repository
3. Try alternative endpoint: `/api/env-check` (should still work)
4. Redeploy if necessary

## Testing Alternative Endpoint

The existing `/api/env-check` endpoint is still available:

```bash
curl https://yourdomain.vercel.app/api/env-check | jq
```

This endpoint has similar functionality but without the enhanced summary and warnings.

## Local Testing

You can also test locally before deploying:

```bash
# 1. Ensure environment variables are in .env.local
# 2. Start dev server
npm run dev

# 3. In another terminal, test the endpoint
curl http://localhost:3000/api/env | jq

# Expected: All variables should show "present": true
```

## Monitoring in Production

### Check Vercel Logs

1. Go to Vercel Dashboard → Your Project → Logs
2. Filter by Function Logs
3. Look for any errors related to environment variables or authentication

### Monitor Build Logs

Build logs will show environment variable validation:

```
🔍 Environment Variable Validation
✅ NEXTAUTH_SECRET: present (length: 44)
✅ NEXTAUTH_URL: present (length: 35)
...
✅ All required environment variables are present!
```

If any are missing, the build will fail with a clear error message.

## Security Notes

### What the Endpoint Does NOT Expose:
- ❌ Actual secret values
- ❌ Database passwords
- ❌ OAuth client secrets
- ❌ Any sensitive data

### What the Endpoint DOES Show:
- ✅ Variable presence (true/false)
- ✅ Variable length (character count)
- ✅ NODE_ENV
- ✅ Timestamp
- ✅ Warning messages for misconfigurations

### Best Practices:
1. Test immediately after deployment
2. Monitor the endpoint during initial setup
3. Consider limiting access if your security policy requires it
4. Use this endpoint to diagnose issues, not for regular monitoring
5. Review warnings and address them promptly

## Quick Reference

### Generate Secure Secret
```bash
openssl rand -base64 32
```

### Test Diagnostic Endpoint
```bash
curl https://yourdomain.vercel.app/api/env | jq
```

### Check Specific Variable
```bash
curl https://yourdomain.vercel.app/api/env | jq '.variables.NEXTAUTH_SECRET'
```

### Verify Summary
```bash
curl https://yourdomain.vercel.app/api/env | jq '.summary'
```

### Check for Warnings
```bash
curl https://yourdomain.vercel.app/api/env | jq '.warnings'
```

## Additional Resources

- **Comprehensive Guide**: `docs/DEPLOYMENT_VERIFICATION.md`
- **Vercel Setup**: `docs/VERCEL_ENV_SETUP.md`
- **General Info**: `README.md`
- **Environment Template**: `.env.example`

## Success Criteria

✅ Deployment completes successfully  
✅ `/api/env` returns 200 OK  
✅ All 6 variables show `"present": true`  
✅ `summary.missing` equals `0`  
✅ No warnings in response (or warnings addressed)  
✅ Authentication works correctly  
✅ Application functions normally  

---

**Questions or Issues?**

If you encounter any problems:
1. Check the response from `/api/env` for specific warnings
2. Review `docs/DEPLOYMENT_VERIFICATION.md` for detailed troubleshooting
3. Verify all environment variables in Vercel Dashboard
4. Check Vercel deployment logs for errors
5. Ensure you redeployed after setting/updating variables

**Last Updated**: 2025-11-08  
**Branch**: fix-nextauth-secret-diagnostics
