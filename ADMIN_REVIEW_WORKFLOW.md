# Enhanced Admin Question Review Workflow

## Overview
The admin question review workflow has been enhanced to provide a comprehensive review system for approving or rejecting questions. This feature is specifically designed for admin users to review AI-generated or imported questions before they are made available to students.

## Key Features

### 1. **Star Rating (Required)**
- Admins must provide a 1-5 star rating for each question review
- Rating is enforced when approving or rejecting questions
- Visual feedback with interactive star icons (hover and click)
- Ratings are stored in the Question model for historical tracking

### 2. **Diagram Accuracy Check (Conditional)**
- Checkbox labeled "Diagram is accurate" 
- Only displayed when a question contains a diagram, chart, or graph (imageUrl or chartData present)
- Helps ensure visual content quality
- Stored as boolean field in the database

### 3. **Review Comments (Optional)**
- Multi-line text area for detailed reviewer feedback
- Can include suggestions for improvements or notes about the question
- Useful for tracking review history and reasoning

### 4. **Review Status**
- Three states: `pending`, `approved`, `rejected`
- Only approved questions are shown to students
- Status can be updated by authorized admins only

## Database Schema Changes

### Question Model Updates
```prisma
model Question {
  // ... existing fields ...
  
  // Enhanced review fields
  reviewStatus      String?  // 'pending' | 'approved' | 'rejected'
  reviewRating      Int?     // Rating 1-5 from admin review (NEW)
  diagramAccurate   Boolean? // Whether diagram/chart is accurate (NEW)
  reviewComments    String?  @db.Text // Reviewer's feedback
  reviewedBy        String?  // Reviewer's identifier (admin email)
  reviewedAt        DateTime?
}
```

### Migration
A new migration has been created to add these fields:
- File: `prisma/migrations/20251109153435_add_enhanced_review_fields/migration.sql`
- Fields are nullable for backward compatibility with existing questions
- Uses `IF NOT EXISTS` clause to prevent errors on re-run

## API Endpoints

### PATCH /api/admin/questions
**Updated to handle enhanced review workflow**

**Authentication Required:** Yes (Admin only - checked against ADMIN_EMAILS)

**Request Body:**
```json
{
  "questionId": "question-id-here",
  "reviewStatus": "approved",
  "reviewRating": 4,
  "diagramAccurate": true,
  "reviewComments": "Well-structured question with clear diagram"
}
```

**Validation Rules:**
- `reviewStatus` must be one of: `pending`, `approved`, `rejected`
- `reviewRating` is **required** when status is `approved` or `rejected`
- `reviewRating` must be an integer between 1 and 5
- `diagramAccurate` is optional (boolean)
- `reviewComments` is optional (string)

**Response:**
```json
{
  "question": {
    "id": "question-id",
    "reviewStatus": "approved",
    "reviewRating": 4,
    "diagramAccurate": true,
    "reviewComments": "Well-structured question with clear diagram",
    "reviewedBy": "admin@example.com",
    "reviewedAt": "2025-11-09T15:30:00.000Z"
    // ... other question fields ...
  }
}
```

**Error Responses:**
- `401 Unauthorized`: User is not an admin
- `400 Bad Request`: Missing required fields or invalid rating
- `404 Not Found`: Question not found
- `500 Internal Server Error`: Database or server error

### GET /api/admin/questions
**Updated to include new review fields**

Returns questions with the new `reviewRating` and `diagramAccurate` fields included in the response.

## Admin UI Updates

### Enhanced Review Form
Located at: `/admin/questions`

**Features:**
1. **Star Rating Control**
   - Interactive 1-5 star selection
   - Hover effects for better UX
   - Visual confirmation of selected rating
   - Required field indicator (red asterisk)

2. **Diagram Accuracy Checkbox**
   - Conditionally displayed based on question content
   - Only shown if question has `imageUrl` or `chartData`
   - Clear label: "Diagram is accurate"

3. **Review Comments**
   - Multi-line textarea
   - Labeled as optional
   - Placeholder text for guidance

4. **Action Buttons**
   - ✅ Approve: Green button (requires rating)
   - ❌ Reject: Red button (requires rating)
   - Cancel: Gray button (resets form)
   - All buttons disabled during submission
   - Loading state: "Processing..." text

5. **Validation & Feedback**
   - Client-side validation: Rating required before submit
   - Error messages displayed above form
   - Success feedback with automatic refresh
   - Prevents duplicate submissions with loading state

### Review Information Display
When a question has been reviewed, the UI displays:
- Rating as visual stars (filled/unfilled)
- Numeric rating (e.g., "4/5")
- Diagram accuracy status (if applicable): "✓ Accurate" or "✗ Not accurate"
- Review comments
- Reviewer email
- Review timestamp

### Form State Management
- Form state resets when:
  - Opening a new review
  - Canceling a review
  - Successfully submitting a review
- State includes: rating, hover rating, diagram accuracy, comments, submitting status, errors

## Setup & Deployment

### 1. Generate Prisma Client
```bash
npm run db:generate
```

### 2. Run Database Migration
```bash
npm run db:migrate
# or for production
npx prisma migrate deploy
```

### 3. Verify Migration
```bash
npm run db:studio
```
Check that `questions` table has new columns: `reviewRating` and `diagramAccurate`

## Usage Guide for Admins

### Reviewing a Question

1. **Navigate to Admin Questions Page**
   - Go to `/admin/questions`
   - Must be logged in as an admin user

2. **Filter Questions**
   - Use filters to find pending questions
   - Filter by status: "Pending" to see unreviewed questions
   - Filter by category, subtopic, etc.

3. **Review a Question**
   - Click "📝 Review Question" button
   - Read the question, options, explanation, and passage (if any)
   - Check the visual diagram/chart (if present)

4. **Complete Review Form**
   - **Step 1:** Click on stars to rate (1-5) - REQUIRED
   - **Step 2:** If question has a diagram, check "Diagram is accurate" if applicable
   - **Step 3:** Add comments (optional but recommended)
   - **Step 4:** Click "✅ Approve" or "❌ Reject"

5. **After Submission**
   - Review is saved immediately
   - Question status updates to approved or rejected
   - Form automatically closes
   - Question card shows review information

### Best Practices

1. **Rating Guidelines**
   - 5 stars: Excellent question, no issues
   - 4 stars: Good question, minor improvements possible
   - 3 stars: Acceptable with some issues
   - 2 stars: Below standard, needs revision
   - 1 star: Poor quality, reject

2. **Diagram Accuracy**
   - Always check if diagram matches the question
   - Verify labels, values, and visual representation
   - Only check if diagram is 100% accurate

3. **Review Comments**
   - Be specific about issues found
   - Suggest improvements when rejecting
   - Note positive aspects for approved questions
   - Include any concerns or edge cases

## Backward Compatibility

### Existing Questions
- All new fields are nullable
- Existing questions without review ratings will show "—" or not display rating
- No data loss or breaking changes
- Questions can be re-reviewed to add new fields

### Migration Safety
- Uses `IF NOT EXISTS` in migration SQL
- Can be run multiple times safely
- Rollback not required (nullable fields)

## Testing

### Manual Testing Checklist

1. **Authentication & Authorization**
   - [ ] Non-admin users cannot access `/admin/questions`
   - [ ] Admin users can access the page
   - [ ] API rejects non-admin requests with 401

2. **Review Form Display**
   - [ ] Star rating control appears
   - [ ] Stars respond to hover
   - [ ] Stars respond to click
   - [ ] Diagram checkbox appears only when question has imageUrl/chartData
   - [ ] Diagram checkbox hidden for questions without visuals
   - [ ] Comments textarea is present
   - [ ] All fields have proper labels

3. **Validation**
   - [ ] Cannot submit without rating
   - [ ] Error message displays when submitting without rating
   - [ ] Can submit with just rating
   - [ ] Can submit with rating + comments
   - [ ] Can submit with rating + diagram checkbox
   - [ ] Can submit with all fields filled

4. **Submit Actions**
   - [ ] Approve button submits with status "approved"
   - [ ] Reject button submits with status "rejected"
   - [ ] Cancel button resets form and closes review
   - [ ] Form shows loading state during submission
   - [ ] Buttons are disabled during submission
   - [ ] Cannot double-submit

5. **API Validation**
   - [ ] API rejects missing rating with 400
   - [ ] API rejects invalid rating (<1 or >5) with 400
   - [ ] API rejects invalid status with 400
   - [ ] API accepts valid requests and returns 200
   - [ ] Response includes all new fields

6. **Display & State**
   - [ ] Reviewed questions show rating stars
   - [ ] Diagram accuracy displays correctly
   - [ ] Comments display in review info section
   - [ ] Reviewer email and timestamp shown
   - [ ] Form state resets after successful submit
   - [ ] Page updates with new review data

7. **Backward Compatibility**
   - [ ] Existing questions load without errors
   - [ ] Questions without reviews display properly
   - [ ] Can review old questions with new form
   - [ ] No breaking changes in UI or API

### Database Testing

```bash
# Check migration applied
npm run db:studio
# Verify columns exist: reviewRating (Int), diagramAccurate (Boolean)

# Test query
npx prisma db execute --stdin <<EOF
SELECT id, reviewRating, diagramAccurate, reviewStatus 
FROM questions 
WHERE reviewedAt IS NOT NULL 
LIMIT 5;
EOF
```

## Security Considerations

### CodeQL Analysis
✅ **Passed** - No security vulnerabilities detected

### Access Control
- All admin endpoints require authentication
- Email-based admin authorization (ADMIN_EMAILS)
- No public access to admin functionality
- SQL injection prevented by Prisma ORM

### Data Validation
- Type checking on all inputs
- Range validation for rating (1-5)
- Status enum validation
- Sanitized user inputs

## Troubleshooting

### Issue: Rating not required error persists
**Solution:** Ensure rating state is set (click stars) before submission. Check browser console for errors.

### Issue: Diagram checkbox not showing
**Solution:** Verify question has `imageUrl` or `chartData` field populated. Check database record.

### Issue: Form doesn't reset after submit
**Solution:** Check that `onSubmitSuccess` callback is executing. Verify state reset in cancel handler.

### Issue: Migration fails
**Solution:** 
1. Check database connection
2. Verify migration hasn't been applied already
3. Use `IF NOT EXISTS` clause (already included)
4. Check Prisma logs for detailed error

### Issue: Unauthorized when submitting review
**Solution:** 
1. Verify user email is in ADMIN_EMAILS constant
2. Check session is valid
3. Verify API route has correct auth check

## Future Enhancements

Possible improvements for future versions:
- Bulk review operations
- Review history/audit log
- Review analytics dashboard
- Automated quality checks
- Reviewer assignment system
- Review templates for common feedback
- Export review reports

## Related Documentation

- [REVIEW_FEATURE.md](./REVIEW_FEATURE.md) - User-facing question review feature
- [ADMIN_QUESTION_GENERATION.md](./ADMIN_QUESTION_GENERATION.md) - Admin question generation
- Prisma Schema: `prisma/schema.prisma`
- API Routes: `src/app/api/admin/questions/route.ts`
- Admin UI: `src/app/admin/questions/page.tsx`
