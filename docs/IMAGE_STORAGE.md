# Image Storage System Documentation

## Overview

DuckSAT now uses **database blob storage** for all generated images (SVGs, diagrams, charts). This approach ensures full compatibility with serverless platforms like Vercel, where filesystem storage is ephemeral.

## Architecture

### Database Schema

The `Question` model includes these image-related fields:

```prisma
model Question {
  // ... other fields
  imageUrl      String?  // API route URL (/api/generated-images/{id})
  imageData     Bytes?   // Binary image data stored as blob
  imageMimeType String?  // Content type (e.g., 'image/svg+xml', 'image/png')
  imageAlt      String?  // Alt text for accessibility
  // ... other fields
}
```

### API Route

**Endpoint**: `/api/generated-images/[id]`

This route serves images directly from the database:
- Fetches image data for the specified question ID
- Returns the image with appropriate `Content-Type` header
- Implements aggressive caching (`max-age=31536000, immutable`)
- Returns a user-friendly 404 SVG if image not found

### Image Generation Service

The `imageGenerationService` has been updated to:

1. **Generate SVGs programmatically** - Creates coordinate planes, bar charts, scatter plots, etc.
2. **Store in database** - Saves image data as blob when `questionId` is provided
3. **Return API URL** - Returns `/api/generated-images/{questionId}` instead of filesystem path

## Usage

### Generating Images for New Questions

When creating a question with an image:

```typescript
import { imageGenerationService } from '@/services/imageGenerationService'

// Create question first to get ID
const question = await prisma.question.create({
  data: {
    // ... question data
  }
})

// Generate SVG with question ID
const chartConfig = {
  type: 'coordinate-plane',
  description: 'A coordinate plane with...',
  questionId: question.id  // Important: provide question ID
}

const imageUrl = await imageGenerationService.generateSVGChart(chartConfig)

// imageUrl will be: /api/generated-images/{question.id}
```

### Displaying Images

In your React components, use the API route URL:

```tsx
<img 
  src={`/api/generated-images/${questionId}`}
  alt={question.imageAlt || 'Math diagram'}
/>
```

### Generating Image Data Without Saving

If you need the image data without storing it:

```typescript
const imageData = await imageGenerationService.generateSVGImageData(chartConfig)

if (imageData) {
  // imageData.data is a Buffer
  // imageData.mimeType is the content type
}
```

## Migration

### Migrating Existing Filesystem Images

Run the migration script to move existing images from `/public/generated-images/` to the database:

```bash
npm run db:migrate-images
```

This script:
1. Finds all questions with `imageUrl` but no `imageData`
2. Reads the image files from the filesystem
3. Stores them as blobs in the database
4. Updates `imageUrl` to point to the new API route

### Database Migration

Apply the schema changes:

```bash
# Development
npx prisma migrate dev

# Production
npx prisma migrate deploy
```

## Benefits

### ✅ Vercel Compatibility
- No filesystem storage required
- Works perfectly with serverless functions
- No issues with ephemeral storage

### ✅ Performance
- Aggressive caching reduces database queries
- Images served directly from database with minimal overhead
- No need for CDN configuration

### ✅ Reliability
- Images never get "lost" due to deployment
- No 404s from missing files
- Atomic updates (image data and question data updated together)

### ✅ Simplicity
- No need to manage file uploads/storage
- No need for external storage services (S3, Cloudinary, etc.)
- Single source of truth (database)

## Troubleshooting

### Images Not Loading

1. **Check database**: Verify `imageData` field is populated
   ```sql
   SELECT id, imageUrl, imageMimeType, LENGTH(imageData) as image_size 
   FROM questions 
   WHERE imageUrl IS NOT NULL;
   ```

2. **Check API route**: Visit `/api/generated-images/{questionId}` directly
   - Should return the image
   - Should have correct `Content-Type` header

3. **Check browser console**: Look for 404 or other errors

### Migration Failed

If the migration script fails:

1. Check that image files exist in `/public/generated-images/`
2. Verify database connection
3. Check file permissions
4. Run with verbose logging:
   ```bash
   DEBUG=* npm run db:migrate-images
   ```

### 404 SVG Appears

The 404 SVG appears when:
- Question doesn't exist
- Question has no `imageData`
- Database error occurs

Check the server logs for the actual error.

## Best Practices

1. **Always provide `questionId`** when generating images for questions
2. **Set appropriate `imageAlt`** for accessibility
3. **Use the migration script** before removing old filesystem images
4. **Monitor image sizes** - keep SVGs optimized
5. **Test locally** before deploying to production

## API Reference

### GET /api/generated-images/[id]

**Parameters:**
- `id` (string, required): Question ID

**Response Headers:**
- `Content-Type`: Image MIME type (e.g., `image/svg+xml`)
- `Cache-Control`: Caching directive
- `X-Image-Alt`: Alt text for the image

**Response:**
- **200**: Image data
- **404**: 404 SVG (when image not found)
- **500**: 404 SVG (on error)

**Example:**
```bash
curl https://yourdomain.com/api/generated-images/clx123abc
```

## Future Enhancements

Possible improvements:
- [ ] Image optimization (compress PNGs, optimize SVGs)
- [ ] Support for more image formats
- [ ] Bulk image operations API
- [ ] Image versioning
- [ ] CDN integration for even better performance
