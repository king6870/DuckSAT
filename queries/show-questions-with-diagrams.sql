-- Query: Show all working questions with diagrams
-- Database: DuckSAT_DB
-- Table: questions
--
-- NOTE: SQL query editors cannot display binary image data as actual images.
-- To VIEW the actual diagrams, run this script instead:
--   npx tsx scripts/export-questions-with-diagrams-interactive.ts
-- This will generate an HTML file you can open in your browser with all images rendered.

-- Basic query showing questions with diagrams
SELECT 
    id,
    CAST(question AS NVARCHAR(MAX)) as question,
    CAST(options AS NVARCHAR(MAX)) as options,
    correctAnswer,
    CAST(explanation AS NVARCHAR(MAX)) as explanation,
    visualType,
    DATALENGTH(imageData) as imageSizeBytes,
    DATALENGTH(imageData) / 1024.0 as imageSizeKB,
    imageMimeType,
    imageAlt,
    category,
    subtopic,
    difficulty,
    difficultyScore,
    moduleType,
    source,
    reviewStatus,
    diagramAccurate,
    createdAt,
    updatedAt
FROM questions
WHERE isActive = 1 
  AND imageData IS NOT NULL
ORDER BY createdAt DESC;

-- ==========================================
-- Summary statistics query
-- ==========================================
SELECT 
    COUNT(*) as TotalQuestionsWithDiagrams,
    SUM(DATALENGTH(imageData)) / 1024.0 / 1024.0 as TotalStorageMB,
    AVG(DATALENGTH(imageData)) / 1024.0 as AvgImageSizeKB,
    COUNT(CASE WHEN diagramAccurate = 1 THEN 1 END) as DiagramsApproved,
    COUNT(CASE WHEN diagramAccurate IS NOT NULL THEN 1 END) as DiagramsReviewed
FROM questions
WHERE isActive = 1 
  AND imageData IS NOT NULL;

-- ==========================================
-- Breakdown by category
-- ==========================================
SELECT 
    category,
    COUNT(*) as QuestionCount,
    SUM(DATALENGTH(imageData)) / 1024.0 / 1024.0 as TotalStorageMB
FROM questions
WHERE isActive = 1 
  AND imageData IS NOT NULL
GROUP BY category
ORDER BY QuestionCount DESC;

-- ==========================================
-- Breakdown by visual type
-- ==========================================
SELECT 
    ISNULL(visualType, 'unspecified') as VisualType,
    COUNT(*) as QuestionCount
FROM questions
WHERE isActive = 1 
  AND imageData IS NOT NULL
GROUP BY visualType
ORDER BY QuestionCount DESC;

-- ==========================================
-- Questions with answers decoded (JSON parsing)
-- ==========================================
SELECT 
    id,
    LEFT(CAST(question AS NVARCHAR(MAX)), 100) + '...' as QuestionPreview,
    JSON_VALUE(CAST(options AS NVARCHAR(MAX)), '$[' + CAST(correctAnswer as VARCHAR) + ']') as CorrectAnswerText,
    correctAnswer as CorrectAnswerIndex,
    LEFT(CAST(explanation AS NVARCHAR(MAX)), 150) + '...' as ExplanationPreview,
    visualType,
    DATALENGTH(imageData) / 1024.0 as ImageSizeKB,
    category,
    difficulty,
    createdAt
FROM questions
WHERE isActive = 1 
  AND imageData IS NOT NULL
ORDER BY createdAt DESC;

-- ==========================================
-- Full detailed view with all choices
-- ==========================================
SELECT 
    id,
    CAST(question AS NVARCHAR(MAX)) as question,
    JSON_VALUE(CAST(options AS NVARCHAR(MAX)), '$[0]') as ChoiceA,
    JSON_VALUE(CAST(options AS NVARCHAR(MAX)), '$[1]') as ChoiceB,
    JSON_VALUE(CAST(options AS NVARCHAR(MAX)), '$[2]') as ChoiceC,
    JSON_VALUE(CAST(options AS NVARCHAR(MAX)), '$[3]') as ChoiceD,
    CASE correctAnswer
        WHEN 0 THEN 'A'
        WHEN 1 THEN 'B'
        WHEN 2 THEN 'C'
        WHEN 3 THEN 'D'
    END as CorrectAnswerLetter,
    JSON_VALUE(CAST(options AS NVARCHAR(MAX)), '$[' + CAST(correctAnswer as VARCHAR) + ']') as CorrectAnswerText,
    CAST(explanation AS NVARCHAR(MAX)) as explanation,
    imageAlt as DiagramDescription,
    DATALENGTH(imageData) / 1024.0 as ImageSizeKB,
    category,
    subtopic,
    difficulty,
    source,
    createdAt
FROM questions
WHERE isActive = 1 
  AND imageData IS NOT NULL
ORDER BY createdAt DESC;
