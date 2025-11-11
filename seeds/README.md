# Seeds Directory

This directory contains seed data for the DuckSAT application, specifically sample questions used for testing and demonstration purposes.

## Contents

### `sample-questions.ts`

Contains an array of sample SAT questions with the following features:

- **Questions with diagrams**: Includes geometry and algebra questions with visual diagrams
- **imageUrl fields**: Points to SVG assets stored in `/public/assets/diagrams/`
- **diagramSvg compatibility**: Retains inline SVG strings for backward compatibility where needed
- **Review fields**: All questions have `reviewStatus: 'pending'` and `createdBy: 'seed'`
- **Correct answers**: Questions include validated correct answers and explanations

### Question Types

1. **Math - Geometry (Triangle)**: Tests angle calculation in triangles with a diagram
2. **Math - Algebra (Linear Models)**: Tests linear model interpretation with a scatter plot
3. **Math - Algebra (Simple)**: Basic linear equation solving without diagrams
4. **Reading-Writing (Main Ideas)**: Comprehension question without diagrams

## Assets

SVG diagrams are stored in `/public/assets/diagrams/`:

- `sample_triangle.svg`: Triangle diagram showing angles A (45°), B (60°), and C (to be determined)
- `sample_lines.svg`: Scatter plot showing the relationship between study hours and test scores

Both SVG files include:
- Proper `width`, `height`, and `viewBox` attributes
- ARIA labels and descriptions for accessibility
- Clean, semantic SVG markup

## Usage

### Importing in Seed Scripts

```typescript
import { sampleQuestions } from '../seeds/sample-questions';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDatabase() {
  for (const question of sampleQuestions) {
    await prisma.question.create({
      data: question,
    });
  }
}
```

### Using with Reset and Seed Script

The sample questions can be imported and used in scripts like `reset-and-seed-sample-questions.ts`:

```typescript
import { sampleQuestions } from '../seeds/sample-questions';

// Use directly or modify as needed
const questionsToSeed = sampleQuestions.filter(q => q.moduleType === 'math');
```

## Testing Diagram Rendering

After seeding these questions:

1. Run your seed script to populate the database
2. Visit `/questions/review` as a non-admin user
3. Verify that diagrams render correctly for the geometry and linear models questions
4. Check that the filter for "Has Diagram" works correctly

The question-review UI checks for `question.imageUrl` or `question.chartData` to determine if a diagram should be displayed. These sample questions now include proper `imageUrl` fields pointing to the SVG assets.

## Notes

- The `diagramSvg` field is kept for compatibility but is not used by the current UI rendering logic
- All SVG assets should be placed in `/public/assets/diagrams/` to be accessible via the `/assets/diagrams/` URL path
- Questions use 0-indexed `correctAnswer` values (0, 1, 2, or 3 for options A, B, C, D)
