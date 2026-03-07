# Reading Batch Validation Spec

## Purpose
Define the requirements and validation rules for SAT reading question batch files with diagrams.

## Requirements
- Each question must have:
  - `question` (string)
  - `choices` (array of 4 strings)
  - `diagram_description` (string)
  - `diagram_img` (base64 string, valid PNG)
  - `explanation` (string)
- No control characters or invalid JSON formatting.
- All fields must be non-empty and properly escaped.
- Batch file must be a valid JSON array of question objects.

## Validation Steps
1. Check JSON syntax and structure.
2. Ensure all required fields are present and non-empty for each question.
3. Validate base64 image string for PNG format.
4. Check for and remove any control characters.
5. Report and auto-fix missing or invalid fields if possible.

## Error Handling
- If a question fails validation, log the error and attempt auto-fix.
- If auto-fix is not possible, mark the question for manual review.

## Output
- Validated batch file ready for import and use in test-taking and review interfaces.
