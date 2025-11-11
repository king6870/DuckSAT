# Seed Data for DuckSAT Questions

This directory contains sample questions for testing and development purposes.

## Files

### sample-questions.ts
Contains three sample questions demonstrating different question types:
1. **Reading Comprehension** - Text-based passage question
2. **Geometry (with diagram)** - Triangle problem with visual SVG diagram
3. **Algebra (with diagram)** - Linear equations with graph diagram

Each question includes:
- Question stem
- Multiple choice options
- Correct answer
- Detailed explanation
- Optional passage text
- Optional diagram reference (imageUrl)
- Tags for categorization
- Review status

## Related Files

### Diagram SVG Files
The diagram questions reference SVG files stored in:
- `public/assets/diagrams/sample_triangle.svg` - Isosceles triangle diagram
- `public/assets/diagrams/sample_lines.svg` - Linear graph diagram

These SVG files are served by Next.js from the public directory and rendered on the question-review page.

### Seed Script
Use the seed script to import these questions into the database:
```bash
npm run db:seed-sample
```

Or manually:
```bash
npx tsx scripts/seed-sample-questions.ts
```

## Question Format

Questions use a simplified format that is mapped to the database schema:

```typescript
{
  id: string;           // Unique identifier
  type: string;         // 'reading', 'diagram', 'math'
  title: string;        // Display title
  passage?: string;     // Optional reading passage
  imageUrl?: string;    // Path to diagram image in public/
  imageAlt?: string;    // Accessibility text for diagram
  stem: string;         // The actual question text
  choices: Choice[];    // Array of {id, text} answer options
  answerId: string;     // ID of correct choice
  explanation?: string; // Why the answer is correct
  tags?: string[];      // Categorization tags
  reviewStatus?: string; // 'pending', 'approved', 'rejected'
}
```

## Usage

1. **View sample data**: Import and inspect the questions
   ```typescript
   import { sampleQuestions } from './seeds/sample-questions';
   ```

2. **Seed database**: Run the seed script to add questions to the database
   ```bash
   npx tsx scripts/seed-sample-questions.ts
   ```

3. **View in UI**: Navigate to `/question-review` page to see the questions with rendered diagrams

## Diagram Rendering

The question-review page uses the `ChartRenderer` component to display diagrams:
- If `imageUrl` is provided, it renders the image from the public directory
- SVG files are displayed inline with proper styling
- Fallback messages shown if image fails to load
