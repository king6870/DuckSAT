# Database Image Verification Guide

## Purpose
This document provides instructions for verifying whether images are properly stored in the database for questions in the DuckSAT application.

## Quick Check Script

### Run the verification script
```bash
npx tsx scripts/check-database-images.ts
```

This script will:
- Count total questions in the database
- Count questions with `imageUrl` set
- Display sample questions with their image information
- Show image URL formats and whether chartData exists

### Expected Output
```
🔍 Checking database for images...

Found 10 questions with images:

1. Question ID: abc123...
   Question: What is the value of x in the equation...
   Image URL: /api/generated-images/abc123...
   Image Alt: Graph showing linear equation...
   Chart Data: Yes

📊 Summary:
   Total questions: 150
   Questions with images: 45
   Questions without images: 105
```

## Image Storage Formats

### 1. Database Blob Storage (Recommended for Production)
**Format:** `/api/generated-images/[questionId]`

**Database columns:**
- `imageData` (BYTEA) - Binary image data
- `imageMimeType` (TEXT) - MIME type (e.g., 'image/svg+xml', 'image/png')
- `imageUrl` (TEXT) - API endpoint path

**Advantages:**
- Works in serverless environments (Vercel, AWS Lambda)
- No filesystem dependencies
- Images migrate with database
- Better for CDN caching

**Check if migration is applied:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'questions' 
AND column_name IN ('imageData', 'imageMimeType');
```

### 2. Filesystem Storage (Legacy)
**Format:** `/generated-images/[filename].svg` or `/uploads/[filename].png`

**Advantages:**
- Simple to implement
- Direct file access
- Easy debugging

**Disadvantages:**
- Doesn't work in serverless deployments
- Files lost on redeploy in ephemeral filesystems
- Requires separate backup strategy

### 3. Dynamic Chart Data (No Image)
**Format:** Only `chartData` JSON field populated, no `imageUrl`

**Example:**
```json
{
  "type": "scatter",
  "points": [
    {"x": 0, "y": 0, "label": "Origin"},
    {"x": 2, "y": 4, "label": "Point A"}
  ],
  "line": true
}
```

**Rendering:**
- ChartRenderer generates SVG dynamically from chartData
- No image storage needed
- Works everywhere

## Manual Database Query

### Check image storage status
```sql
-- Count questions by image storage type
SELECT 
  COUNT(*) FILTER (WHERE "imageData" IS NOT NULL) as blob_stored,
  COUNT(*) FILTER (WHERE "imageUrl" LIKE '/api/generated-images/%') as blob_url,
  COUNT(*) FILTER (WHERE "imageUrl" LIKE '/generated-images/%') as filesystem,
  COUNT(*) FILTER (WHERE "imageUrl" LIKE '/uploads/%') as uploads,
  COUNT(*) FILTER (WHERE "imageUrl" IS NULL AND "chartData" IS NOT NULL) as chart_only,
  COUNT(*) as total
FROM questions;
```

### Find questions missing image data
```sql
-- Questions with imageUrl but no blob data
SELECT id, "imageUrl", "chartData" IS NOT NULL as has_chart
FROM questions
WHERE "imageUrl" IS NOT NULL 
  AND "imageData" IS NULL
LIMIT 10;
```

### Check specific question
```sql
SELECT 
  id,
  LEFT(question, 50) as question_preview,
  "imageUrl",
  LENGTH("imageData") as image_size_bytes,
  "imageMimeType",
  "chartData" IS NOT NULL as has_chart_data
FROM questions
WHERE id = 'your-question-id-here';
```

## Migrating Filesystem Images to Database

### When to migrate
- Before deploying to Vercel or other serverless platforms
- When consolidating image storage
- During major version updates

### Migration script
```bash
npm run db:migrate-images
```

### What the migration does
1. Finds questions with `imageUrl` but no `imageData`
2. Reads image files from filesystem paths:
   - `/public/generated-images/[filename]`
   - `/public/uploads/[filename]`
3. Stores binary data in `imageData` column
4. Sets appropriate `imageMimeType`
5. Updates `imageUrl` to `/api/generated-images/[id]`

### Migration output
```
🚀 Starting image migration to database...

📊 Found 45 questions with filesystem-based images

Processing question abc123...
  ✅ Migrated successfully (125.50 KB)

Processing question def456...
  ⏭️  Already using database format, skipping

Processing question ghi789...
  ⚠️  File not found: /public/generated-images/graph.svg

======================================================================
📊 Migration Summary
======================================================================
Total questions processed: 45
✅ Successfully migrated: 40
⏭️  Skipped (already migrated): 3
❌ Failed: 2
```

## Troubleshooting

### Issue: No images showing on review page
**Possible causes:**
1. Images not stored in database
2. Migration not run
3. ChartRenderer not receiving data properly

**Solution:**
1. Run check script: `npx tsx scripts/check-database-images.ts`
2. Check if migration is needed: `npm run db:migrate-images`
3. Verify API route is working: `curl http://localhost:3000/api/generated-images/[question-id]`

### Issue: Some images work, others don't
**Possible causes:**
1. Mixed storage formats (some in DB, some in filesystem)
2. Missing files for filesystem-stored images
3. Corrupted image data

**Solution:**
1. Run migration to consolidate: `npm run db:migrate-images`
2. Check failed migrations in output
3. Regenerate missing images if needed

### Issue: Images show 404 SVG
**Possible causes:**
1. `imageData` column is NULL
2. Question ID doesn't exist
3. Database connection issue

**Solution:**
```sql
-- Check if image data exists
SELECT id, "imageData" IS NOT NULL as has_data
FROM questions
WHERE id = '[question-id]';
```

## Production Checklist

Before deploying to production:
- [ ] Run `npx tsx scripts/check-database-images.ts` to verify current state
- [ ] Run `npm run db:migrate-images` if filesystem images exist
- [ ] Verify no failed migrations
- [ ] Test image display on staging environment
- [ ] Check API endpoint `/api/generated-images/[id]` returns images
- [ ] Confirm ChartRenderer handles chartData-only questions
- [ ] Test questions with missing images show appropriate fallback

## Monitoring

### Key metrics to track
1. **Total questions with images**
2. **Blob storage vs filesystem storage ratio**
3. **Failed image loads (404s)**
4. **Average image size**
5. **ChartData-only questions**

### Alerts to set up
- Alert when >5% of images return 404
- Alert when average image size exceeds 500KB
- Alert when filesystem-stored images are detected in production

## Related Files
- `scripts/check-database-images.ts` - Verification script
- `scripts/migrate-images-to-db.ts` - Migration script
- `src/app/api/generated-images/[id]/route.ts` - Image serving endpoint
- `src/components/ChartRenderer.tsx` - Image rendering component
- `prisma/schema.prisma` - Database schema
- `prisma/migrations/20251108214755_add_image_blob_storage/` - Migration SQL

## Additional Resources
- [Prisma Blob Storage Documentation](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-scalar-fields#bytes)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Vercel Serverless Functions Limitations](https://vercel.com/docs/concepts/limits/overview)
