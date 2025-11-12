Seed: sample-questions

Files:
- seeds/sample-questions.ts  (exports `sampleQuestions`)
- public/assets/diagrams/sample_triangle.svg  (example external diagram)
- public/assets/diagrams/sample_lines.svg     (example external diagram)

What this is:
- A small set of sample questions (reading, diagram, math) intended to let non-admin users review how passages and diagrams appear on the question-review page.

Important:
- The seed entries now include an `imageUrl` property set to `/assets/diagrams/<name>.svg`. For Next.js to serve these assets at that path, place the diagram files under the `public/assets/diagrams/` directory (not in `src` or repository root `assets/`).
- The codebase's review UI checks `question.imageUrl` (or `question.chartData`) to decide whether to render a diagram; adding `imageUrl` ensures the diagram shows without modifying UI code.
- Inline SVG (diagramSvg) is still included in the seed records for compatibility, but the UI will prefer `imageUrl` if present.

How to use:
1. Create a branch (e.g., seeds/fix-diagrams).
2. Add the above files (seeds/sample-questions.ts and the two SVGs in public/assets/diagrams/).
3. Commit and push the branch.
4. Run your seed/import script or manually insert `sampleQuestions` into the database.
5. Visit /questions/review as a non-admin user and confirm diagrams render.

If you'd prefer the app to render inline SVG strings (diagramSvg) directly rather than using imageUrl, I can provide a small safe-render helper and a patch to the ReviewCard component to do that.