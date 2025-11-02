# Question Review Feature

## Overview
The question review feature allows authenticated users to submit reviews for questions in the DuckSAT application. Each review includes:
- **Star Rating** (1-5 stars, required)
- **Description** (optional text feedback)
- **Diagram Checkbox** (indicates if the question has a diagram)

## Database Schema
A new `QuestionReview` model has been added to the Prisma schema:

```prisma
model QuestionReview {
  id          String   @id @default(cuid())
  questionId  String
  userId      String
  rating      Int      // Star rating (1-5)
  description String?  @db.Text // Optional review description
  hasDiagram  Boolean  @default(false) // Diagram checkbox
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  question Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, questionId]) // One review per user per question
  @@index([questionId])
  @@index([userId])
  @@map("question_reviews")
}
```

## API Endpoints

### POST /api/questions/[id]/review
Submit or update a review for a question.

**Authentication Required:** Yes

**Request Body:**
```json
{
  "rating": 5,
  "description": "Great question with clear explanation",
  "hasDiagram": true
}
```

**Response:**
```json
{
  "id": "clx...",
  "questionId": "question-id",
  "userId": "user-id",
  "rating": 5,
  "description": "Great question with clear explanation",
  "hasDiagram": true,
  "createdAt": "2025-11-02T...",
  "updatedAt": "2025-11-02T..."
}
```

### GET /api/questions/[id]/review
Get all reviews for a specific question.

**Response:**
```json
[
  {
    "id": "clx...",
    "questionId": "question-id",
    "userId": "user-id",
    "rating": 5,
    "description": "Great question",
    "hasDiagram": true,
    "createdAt": "2025-11-02T...",
    "updatedAt": "2025-11-02T...",
    "user": {
      "id": "user-id",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
]
```

## UI Components

### QuestionReviewForm
A form component that allows users to submit reviews. Features include:
- Interactive star rating (hover and click)
- Optional textarea for detailed feedback
- Checkbox for indicating diagram presence
- Form validation (rating is required)
- Error handling and success messages
- Authentication check with sign-in prompt for unauthenticated users

### Integration in Question Review Page
The review form is accessible from the question-review page via an "Add Review" button on each question card. The form appears inline when the button is clicked.

## Setup

1. **Generate Prisma Client:**
   ```bash
   npm run db:generate
   ```

2. **Run Database Migration:**
   ```bash
   npm run db:push
   # or
   npm run db:migrate
   ```

3. **Start the Development Server:**
   ```bash
   npm run dev
   ```

## Usage

1. Navigate to `/question-review` page
2. Click "Add Review" button on any question
3. If not signed in, you'll be prompted to sign in
4. Once authenticated, fill out the review form:
   - Click on stars to rate (1-5)
   - Optionally add a description
   - Check the diagram checkbox if applicable
5. Click "Submit Review" to save
6. Each user can only submit one review per question (updates if re-submitted)

## Testing the Feature

To test the review feature:

1. Ensure you have a PostgreSQL database running and configured
2. Set up authentication (Google OAuth configured in NextAuth)
3. Sign in to the application
4. Navigate to the question-review page
5. Submit a review for a question
6. Verify the review is saved in the database:
   ```bash
   npm run db:studio
   ```
   Check the `question_reviews` table

## Notes
- Reviews are user-specific and question-specific (one review per user per question)
- Users can update their existing reviews
- Reviews are deleted if the associated question or user is deleted (cascade delete)
- The star rating is required; description is optional
