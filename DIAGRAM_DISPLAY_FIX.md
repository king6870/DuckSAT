# Diagram Display Fix

## Issue Summary
Diagrams were not showing on the public question review page due to multiple issues in the rendering logic.

## Root Causes Identified

### 1. ReviewCard Component Issue
**File:** `src/components/ReviewCard.tsx`

**Problem:** The component checked if a diagram exists using `hasDiagram = Boolean(question.imageUrl || question.chartData)`, but only rendered the ChartRenderer when `question.imageUrl` was present. This meant questions with only `chartData` (dynamically generated charts) would show an empty diagram section.

**Before:**
```tsx
{hasDiagram && (
  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
    <h4 className="font-semibold text-gray-900 mb-2">
      {question.chartData ? 'Diagram' : 'Image'}
    </h4>
    {question.imageUrl && (  // ❌ Only renders if imageUrl exists
      <ChartRenderer
        chartData={question.chartData as Record<string, unknown> | undefined}
        imageUrl={question.imageUrl}
        imageAlt={question.imageAlt || 'Question diagram'}
        className="max-w-full"
      />
    )}
  </div>
)}
```

**After:**
```tsx
{hasDiagram && (
  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
    <h4 className="font-semibold text-gray-900 mb-2">
      {question.chartData ? 'Diagram' : 'Image'}
    </h4>
    <ChartRenderer  // ✅ Always renders when hasDiagram is true
      chartData={question.chartData as Record<string, unknown> | undefined}
      imageUrl={question.imageUrl || undefined}
      imageAlt={question.imageAlt || 'Question diagram'}
      className="max-w-full"
    />
  </div>
)}
```

### 2. Question Review Page Issue
**File:** `src/app/question-review/page.tsx`

**Problem:** Similar to ReviewCard, the page showed a warning message when `chartData` existed but no `imageUrl` was present, instead of rendering the chart.

**Before:**
```tsx
{question.imageUrl ? (
  // render logic
) : (
  <div className="p-4 bg-yellow-50 border border-yellow-300 rounded text-sm text-black">
    ⚠️ Diagram data exists but no image URL found. This question may have a rendering issue.
  </div>
)}
```

**After:**
```tsx
{question.imageUrl && question.imageUrl.startsWith('data:image/svg+xml;base64,') ? (
  // Vega spec warning
) : (
  <ChartRenderer  // ✅ Renders charts even without imageUrl
    chartData={(question.chartData ?? { type: 'image' }) as ChartData}
    imageUrl={question.imageUrl || undefined}
    imageAlt={question.imageAlt || 'Question diagram'}
    className="max-w-full"
  />
)}
```

### 3. API Route for Database-Stored Images
**File:** `src/app/api/generated-images/[id]/route.ts`

**Problem:** The API route was disabled with a comment stating that the migration hadn't been applied. However, the schema includes `imageData` and `imageMimeType` fields, and the migration exists.

**Solution:** Enabled the API route to serve images from the database. If the fields don't have data, it returns a friendly 404 SVG indicating the image is not available.

## How ChartRenderer Works

The `ChartRenderer` component has a fallback chain:
1. **Vega Spec:** If imageUrl starts with `data:image/svg+xml;base64,`, attempts to decode and display
2. **Regular Image:** If imageUrl is a regular URL, displays the image
3. **Dynamic Chart:** If no imageUrl but chartData exists, renders using DynamicChart component
4. **Null:** If neither imageUrl nor chartData exist, returns null

This means questions with only `chartData` can still be rendered as dynamic charts (scatter plots, bar charts, geometry diagrams).

## Database Image Storage

The database schema includes support for blob storage:
- `imageData` (Bytes) - Stores the actual image data
- `imageMimeType` (String) - Stores the MIME type (e.g., 'image/svg+xml', 'image/png')
- `imageUrl` (String) - Can point to filesystem path OR `/api/generated-images/[id]` for database-stored images

### Migration Status
The migration `20251108214755_add_image_blob_storage` adds the required columns:
```sql
ALTER TABLE "questions" ADD COLUMN "imageData" BYTEA,
ADD COLUMN "imageMimeType" TEXT;
```

### To Migrate Existing Filesystem Images to Database
Run the migration script:
```bash
npm run db:migrate-images
```

This script:
1. Finds all questions with `imageUrl` but no `imageData`
2. Reads the image files from the filesystem
3. Stores them as blobs in the database
4. Updates `imageUrl` to point to `/api/generated-images/[id]`

## Testing Checklist

### Local Testing
- [ ] Questions with only `chartData` (no imageUrl) display charts correctly
- [ ] Questions with `imageUrl` display images correctly
- [ ] Questions with both `chartData` and `imageUrl` prioritize imageUrl
- [ ] Questions without diagrams don't show empty diagram sections
- [ ] Database-stored images are served correctly via `/api/generated-images/[id]`

### Database Verification
Run this script to check if images are stored:
```bash
npx tsx scripts/check-database-images.ts
```

This will show:
- Total questions in the database
- Questions with imageUrl set
- Questions with imageData (blob storage)
- Sample questions with their image information

## Related Files Changed
- `src/components/ReviewCard.tsx` - Fixed conditional rendering of ChartRenderer
- `src/app/question-review/page.tsx` - Fixed conditional rendering of ChartRenderer
- `src/app/api/generated-images/[id]/route.ts` - Enabled database image serving

## Future Improvements
1. Add a background job to migrate all filesystem-based images to database
2. Add monitoring for questions with missing diagrams
3. Consider adding image compression for blob storage
4. Add retry logic for image loading failures
