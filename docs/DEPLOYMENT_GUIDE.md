# Deployment Guide

## Overview

This guide covers deploying DuckSAT to Vercel with the new database-backed image storage system.

## Prerequisites

1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **PostgreSQL Database** - Recommended: [Neon](https://neon.tech) (serverless PostgreSQL)
3. **Google OAuth Credentials** - For authentication
4. **OpenSSL** - For generating secrets

## Step-by-Step Deployment

### 1. Generate Required Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32
```

### 2. Configure Environment Variables in Vercel

Go to your Vercel project dashboard → Settings → Environment Variables

Add the following variables for **Production**, **Preview**, and **Development** environments:

#### Required Variables

```
NEXTAUTH_SECRET=<your-generated-secret>
NEXTAUTH_URL=https://your-domain.vercel.app
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
DATABASE_URL=<your-neon-pooled-connection-string>
DATABASE_URL_UNPOOLED=<your-neon-direct-connection-string>
```

#### Optional Variables

```
AZURE_OPENAI_API_KEY=<your-azure-openai-key>  # For DALL-E image generation
```

**⚠️ CRITICAL:** Variables MUST be set in Vercel Dashboard. Setting them only in `.env` files or build scripts will NOT make them available at runtime.

### 3. Initial Deployment

#### Option A: Deploy via Vercel Dashboard

1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect Next.js and configure build settings
3. The build will use: `prisma generate && next build`
4. Deploy

#### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### 4. Database Setup

After first deployment, run migrations:

```bash
# Via Vercel CLI
vercel env pull .env.production
npx dotenv-cli -e .env.production -- npx prisma migrate deploy
```

Or run migrations through Vercel's deployment interface.

### 5. Migrate Existing Images (If Applicable)

If you have existing questions with filesystem-based images:

```bash
# Locally with production database
npm run db:migrate-images
```

This will:
- Read images from `/public/generated-images/`
- Store them in the database
- Update `imageUrl` to point to `/api/generated-images/{id}`

### 6. Verify Deployment

1. **Check Environment Variables**
   ```bash
   curl https://your-domain.vercel.app/api/env-check
   ```
   Should return presence (but not values) of all required variables.

2. **Test Authentication**
   - Visit `/admin`
   - Sign in with Google
   - Should redirect to admin dashboard

3. **Test Image Loading**
   - Visit a question with an image
   - Open browser DevTools → Network tab
   - Verify images load from `/api/generated-images/{id}`
   - Check response headers include `Content-Type: image/svg+xml`

4. **Test Admin Question Page**
   - Visit `/admin/questions`
   - Check that questions load
   - Verify images display correctly
   - Check that 404 SVG appears for missing images

## Troubleshooting

### Build Fails: "NEXTAUTH_SECRET environment variable must be set"

**Cause:** Environment variable not set in Vercel Dashboard

**Solution:**
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add `NEXTAUTH_SECRET` with your generated secret
3. Redeploy

### Images Not Loading (404)

**Cause:** Images not migrated to database

**Solution:**
1. Run migration script: `npm run db:migrate-images`
2. Verify images exist in database:
   ```sql
   SELECT id, imageUrl, LENGTH(imageData) FROM questions WHERE imageUrl IS NOT NULL;
   ```

### "Unauthorized" on Admin Pages

**Cause:** User email not in admin list

**Solution:**
1. Check `src/middleware/adminAuth.ts`
2. Add your email to `ADMIN_EMAILS` array
3. Redeploy

### Database Connection Errors

**Cause:** Database URL incorrect or database not accessible

**Solution:**
1. Verify `DATABASE_URL` in Vercel Dashboard
2. Check database is accessible from Vercel's IP range
3. Ensure connection string includes `?sslmode=require` for Neon
4. Use pooled connection string for `DATABASE_URL`

## Database Migrations

### Creating a New Migration

```bash
# Development
npx prisma migrate dev --name descriptive_name

# Production
npx prisma migrate deploy
```

### Checking Migration Status

```bash
npx prisma migrate status
```

### Rolling Back (Not Recommended in Production)

If you must roll back:

```bash
# This requires direct database access
npx prisma migrate resolve --rolled-back <migration_name>
```

## Monitoring

### Logs

View logs in Vercel Dashboard:
- Go to your project → Deployments → Select deployment → Functions
- Click on any API route to see logs

### Performance

Monitor via Vercel Analytics:
- Dashboard → Analytics
- Check response times for `/api/generated-images/*`
- Monitor cache hit rates

## Security Best Practices

1. **Never commit secrets** - Use `.env.local` for local development
2. **Rotate secrets regularly** - Generate new `NEXTAUTH_SECRET` periodically
3. **Use environment-specific URLs** - Different `NEXTAUTH_URL` for preview vs production
4. **Keep dependencies updated** - Run `npm audit` regularly
5. **Review admin access** - Regularly audit `ADMIN_EMAILS` list

## Scaling Considerations

### Image Storage

The current implementation stores images directly in PostgreSQL. For very large deployments:

1. **Monitor database size** - PostgreSQL on Neon has storage limits
2. **Consider CDN** - Add Cloudflare or Vercel Edge Caching for faster image delivery
3. **Optimize images** - Compress SVGs, use smaller dimensions where possible

### Database Connections

- Use pooled connections (`DATABASE_URL`) for all API routes
- Reserve unpooled connection (`DATABASE_URL_UNPOOLED`) for migrations only
- Monitor connection pool usage in Neon dashboard

## Updating Deployment

### Regular Updates

```bash
git push origin main
```

Vercel will automatically rebuild and deploy.

### Manual Redeploy

In Vercel Dashboard:
1. Go to Deployments
2. Find the latest successful deployment
3. Click "..." → "Redeploy"

### Force Clear Build Cache

```bash
# Via CLI
vercel --force

# Or in Dashboard
Settings → General → "Clear Build Cache"
```

## Rollback Procedure

If deployment fails or causes issues:

1. **Immediate Rollback**
   - Vercel Dashboard → Deployments
   - Find last known good deployment
   - Click "..." → "Promote to Production"

2. **Database Rollback** (if migration was applied)
   - This is complex and should be avoided
   - Better to create a new forward migration that fixes issues

## Support

If you encounter issues:

1. Check Vercel deployment logs
2. Review [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md) for environment setup
3. Review [IMAGE_STORAGE.md](./IMAGE_STORAGE.md) for image system details
4. Check GitHub issues for similar problems
5. Contact the development team

## Maintenance Schedule

Recommended maintenance tasks:

- **Weekly**: Check error logs, monitor storage usage
- **Monthly**: Review and update dependencies, audit admin access
- **Quarterly**: Rotate secrets, review performance metrics, optimize database
