-- ============================================
-- Check V2 Questions in Azure SQL Database
-- ============================================

-- 1. Count all V2 questions
SELECT 
    COUNT(*) as TotalV2Questions
FROM questions
WHERE source LIKE '%V2%';

-- 2. Breakdown by module type
SELECT 
    moduleType,
    COUNT(*) as QuestionCount
FROM questions
WHERE source LIKE '%V2%'
GROUP BY moduleType;

-- 3. Count questions with diagrams
SELECT 
    'Math with Diagrams' as Category,
    COUNT(*) as Count
FROM questions
WHERE source LIKE '%V2%' 
    AND moduleType = 'math'
    AND imageData IS NOT NULL
UNION ALL
SELECT 
    'Math without Diagrams' as Category,
    COUNT(*) as Count
FROM questions
WHERE source LIKE '%V2%' 
    AND moduleType = 'math'
    AND imageData IS NULL
UNION ALL
SELECT 
    'Reading with Passages' as Category,
    COUNT(*) as Count
FROM questions
WHERE source LIKE '%V2%' 
    AND moduleType = 'reading-writing'
    AND passage IS NOT NULL;

-- 4. View sample V2 questions (first 5)
SELECT TOP 5
    id,
    moduleType,
    category,
    LEFT(CAST(question AS VARCHAR(MAX)), 100) as QuestionPreview,
    CASE WHEN imageData IS NOT NULL THEN 'Yes' ELSE 'No' END as HasDiagram,
    CASE WHEN passage IS NOT NULL THEN 'Yes' ELSE 'No' END as HasPassage,
    source,
    createdAt
FROM questions
WHERE source LIKE '%V2%'
ORDER BY createdAt DESC;

-- 5. Detailed stats
SELECT 
    'Total Questions' as Metric,
    CAST(COUNT(*) as VARCHAR(20)) as Value
FROM questions
WHERE source LIKE '%V2%'
UNION ALL
SELECT 
    'Math Questions',
    CAST(COUNT(*) as VARCHAR(20))
FROM questions
WHERE source LIKE '%V2%' AND moduleType = 'math'
UNION ALL
SELECT 
    'Reading Questions',
    CAST(COUNT(*) as VARCHAR(20))
FROM questions
WHERE source LIKE '%V2%' AND moduleType = 'reading-writing'
UNION ALL
SELECT 
    'Questions with Diagrams',
    CAST(COUNT(*) as VARCHAR(20))
FROM questions
WHERE source LIKE '%V2%' AND imageData IS NOT NULL
UNION ALL
SELECT 
    'Questions with Passages',
    CAST(COUNT(*) as VARCHAR(20))
FROM questions
WHERE source LIKE '%V2%' AND passage IS NOT NULL
UNION ALL
SELECT 
    'Average Image Size (KB)',
    CAST(AVG(DATALENGTH(imageData)) / 1024 as VARCHAR(20))
FROM questions
WHERE source LIKE '%V2%' AND imageData IS NOT NULL;

-- ============================================
-- 6. VIEW ACTUAL QUESTIONS WITH FULL CONTENT
-- ============================================

-- Math questions with diagram info
SELECT 
    ROW_NUMBER() OVER (ORDER BY createdAt) as QuestionNum,
    moduleType,
    CAST(question AS VARCHAR(MAX)) as FullQuestion,
    CASE WHEN imageData IS NOT NULL 
        THEN 'Yes - ' + CAST(DATALENGTH(imageData)/1024 AS VARCHAR(20)) + ' KB'
        ELSE 'No' 
    END as DiagramInfo,
    CAST(explanation AS VARCHAR(MAX)) as Explanation,
    createdAt
FROM questions
WHERE source LIKE '%V2%' AND moduleType = 'math'
ORDER BY createdAt;

-- Reading questions with passages
SELECT 
    ROW_NUMBER() OVER (ORDER BY createdAt) as QuestionNum,
    moduleType,
    CAST(passage AS VARCHAR(MAX)) as PassageText,
    CAST(question AS VARCHAR(MAX)) as QuestionText,
    CAST(explanation AS VARCHAR(MAX)) as Explanation,
    createdAt
FROM questions
WHERE source LIKE '%V2%' AND moduleType = 'reading-writing'
ORDER BY createdAt;

-- ============================================
-- 7. VIEW ONE COMPLETE QUESTION (ALL FIELDS)
-- ============================================

SELECT TOP 1
    id,
    moduleType,
    difficulty,
    category,
    CAST(question AS VARCHAR(MAX)) as QuestionText,
    CAST(passage AS VARCHAR(MAX)) as PassageText,
    options,
    correctAnswer,
    CAST(explanation AS VARCHAR(MAX)) as Explanation,
    CASE WHEN imageData IS NOT NULL THEN 'YES' ELSE 'NO' END as HasDiagram,
    DATALENGTH(imageData) as DiagramSizeBytes,
    imageAlt,
    source,
    createdAt
FROM questions
WHERE source LIKE '%V2%'
ORDER BY createdAt;
