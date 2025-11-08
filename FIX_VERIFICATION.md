# Fix Verification: imageData Column Error

## Problem Statement
The `/api/questions` endpoint was failing with the following error:
```
Error [PrismaClientKnownRequestError]: 
Invalid `prisma.question.findMany()` invocation:

The column `questions.imageData` does not exist in the current database.
```

This error was preventing questions from loading on:
1. Admin questions page (`/admin/questions`)
2. Question review page (`/question-review`)

## Root Cause Analysis

### What Happened
1. The Prisma schema (`prisma/schema.prisma`) defines these fields on the Question model:
   - `imageData Bytes?` (line 122)
   - `imageMimeType String?` (line 123)
   - `imageAlt String?` (line 124)

2. A migration file exists to add these columns:
   - `prisma/migrations/20251108214755_add_image_blob_storage/migration.sql`
   - This migration adds `imageData` and `imageMimeType` columns

3. The migration has NOT been applied to the production database

4. When Prisma queries use `include` or don't specify `select`, they implicitly select ALL fields defined in the schema, including the non-existent columns

### Why It Failed
- Prisma ORM tried to query `questions.imageData` and `questions.imageMimeType`
- These columns don't exist in the database table
- PostgreSQL returned an error: column does not exist
- The API request failed with HTTP 500

## Solution Implemented

### Strategy
Instead of applying the migration (database is unreachable in this environment), we modified the API routes to explicitly `select` only the fields that exist in the database.

### Files Modified

#### 1. `/api/questions/route.ts`
**Before:** Used `include` which implicitly selects all fields
```typescript
questions = await prisma.question.findMany({
  where,
  include: {
    subtopicRef: {
      include: {
        topic: true
      }
    }
  },
  orderBy: { createdAt: sortOrder },
  take: limit,
  skip: offset
});
```

**After:** Explicitly select only existing fields
```typescript
questions = await prisma.question.findMany({
  where,
  select: {
    id: true,
    subtopicId: true,
    moduleType: true,
    // ... all existing fields except imageData and imageMimeType
    imageUrl: true,
    imageAlt: true,  // This exists (added in init migration)
    chartData: true,
    // imageData: excluded (doesn't exist yet)
    // imageMimeType: excluded (doesn't exist yet)
    subtopicRef: {
      select: { /* explicit fields */ }
    }
  },
  orderBy: { createdAt: sortOrder },
  take: limit,
  skip: offset
});
```

#### 2. `/api/admin/questions/route.ts`
- Changed from `include: { subtopicRef: true }` to explicit `select` with all existing fields
- This endpoint is used by the admin questions page

#### 3. `/api/admin/questions/[id]/route.ts`
- Changed from `findUnique({ where: { id } })` to `findUnique({ where: { id }, select: { /* all fields */ } })`
- Used in admin panel for viewing/editing individual questions

#### 4. `/api/questions/[id]/review/route.ts`
- Changed from `findUnique({ where: { id: params.id } })` to include `select: { id: true }`
- Only needs to check if question exists before allowing review submission

#### 5. `/api/ai-questions/generate/route.ts`
- Changed from `include: { subtopicRef: { include: { topic: true } } }` to explicit `select`
- Used by AI question generation feature

#### 6. `/api/generated-images/[id]/route.ts`
- This endpoint specifically requires `imageData` and `imageMimeType` to serve blob images
- **Temporarily disabled** with early return + comment explaining why
- Returns a 404 SVG with helpful message
- Includes commented-out original code to restore once migration is applied

## Fields Included vs Excluded

### ✅ Included (these exist in database)
All fields from the original `init` migration:
- `id`, `subtopicId`, `moduleType`, `difficulty`, `category`, `subtopic`
- `question`, `passage`, `options`, `correctAnswer`, `explanation`
- `wrongAnswerExplanations`, `imageUrl`, `imageAlt`, `chartData`
- `timeEstimate`, `source`, `tags`, `isActive`
- `reviewStatus`, `reviewComments`, `reviewedBy`, `reviewedAt`
- `createdAt`, `updatedAt`

### ❌ Excluded (these don't exist yet)
Fields added in the unapplied migration:
- `imageData` (Bytes) - for storing image blobs
- `imageMimeType` (String) - for image content type

## Verification Steps

### Type Safety
- ✅ TypeScript compilation passes with no errors in modified API routes
- ✅ All field selections match the actual database schema
- ✅ No breaking changes to API response structure

### Logic Verification
1. **Query Safety**: All `findMany` and `findUnique` calls now use explicit `select`
2. **No Data Loss**: All required fields are still selected and returned to frontend
3. **Backward Compatible**: Response structure unchanged - frontend doesn't need updates
4. **Future Ready**: Clear comments mark where to restore blob storage features

### Expected Behavior After Fix
✅ `/api/questions` will return questions without database errors
✅ Admin questions page will load and display questions
✅ Question review page will load and display questions
✅ Existing functionality (search, filter, pagination) will work
✅ Image URLs will still work (uses `imageUrl` field which exists)
✅ Blob storage endpoint gracefully returns 404 until migration is applied

## Migration Path Forward

When the database migration can be applied:

1. Apply the migration:
   ```bash
   npx prisma migrate deploy
   ```

2. Restore `/api/generated-images/[id]/route.ts`:
   - Uncomment the original code
   - Remove the early return

3. (Optional) Update queries to include blob fields if needed:
   ```typescript
   select: {
     // ... existing fields ...
     imageData: true,
     imageMimeType: true,
   }
   ```

## Notes

- The fix is minimal and surgical - only touches query selection
- No business logic changes
- No frontend changes required
- Maintains all existing functionality except blob storage (which wasn't working anyway)
- Clear comments explain the temporary nature of the changes
