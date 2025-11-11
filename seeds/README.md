# Seeds Directory

This directory contains seed data and scripts for populating the DuckSAT database with sample questions.

## Files

### sample-questions.ts
Contains sample questions with diagrams for testing the question review functionality. Includes:
- Reading comprehension questions
- Diagram-based geometry questions
- Graph-based algebra questions

Each question includes:
- Type definitions matching the Prisma schema
- Inline SVG diagrams (for compatibility)
- References to public SVG assets (recommended approach)
- Full metadata (tags, difficulty, explanations, etc.)

### seed-sample-questions.ts
Script to seed the sample questions into the database. 

**Usage:**
```bash
npm run tsx seeds/seed-sample-questions.ts
```

Or add to package.json scripts:
```json
"seed:samples": "tsx seeds/seed-sample-questions.ts"
```

## Related Files

The SVG diagrams referenced in sample-questions.ts are stored in:
- `public/assets/diagrams/sample_triangle.svg` - Isosceles triangle geometry diagram
- `public/assets/diagrams/sample_lines.svg` - Linear models graph

These files are served as static assets and can be referenced via:
- `/assets/diagrams/sample_triangle.svg`
- `/assets/diagrams/sample_lines.svg`

## Question Review Page

The sample questions are designed to work with the non-admin question review page at:
- Route: `/question-review`
- Component: `src/app/question-review/page.tsx`

The review page uses the `ChartRenderer` component which supports:
- Direct image URLs (recommended for SVGs in public folder)
- Inline SVG data
- Base64-encoded images
- Chart data specifications

## Implementation Notes

1. **Image URLs**: The sample questions use the `imageUrl` field pointing to static assets in the public folder. This is the recommended approach for diagrams.

2. **Backward Compatibility**: The `diagramSvg` field is maintained with inline SVG for backward compatibility with older code that might expect it.

3. **Accessibility**: All SVG diagrams include proper ARIA labels, titles, and descriptions for screen readers.

4. **Database Schema**: Questions must match the Prisma Question model, including fields like `reviewStatus`, `createdById`, etc.
