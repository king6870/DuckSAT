#!/usr/bin/env node
/**
 * Generate SAT Questions CLI - Main Orchestrator for QG800
 * 
 * Usage:
 *   npx tsx scripts/generate-sat-questions.ts generate --topic algebra --count 20
 *   npx tsx scripts/generate-sat-questions.ts generate --all
 *   npx tsx scripts/generate-sat-questions.ts status
 *   npx tsx scripts/generate-sat-questions.ts approve --batch batch-001-algebra
 * 
 * @see docs/specs/SPEC-QG800.md
 * @see docs/specs/SYSTEM-INSTRUCTIONS-QG800.md
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { AzureOpenAI } from 'openai';
import katex from 'katex';
import { 
  GeneratedQuestion, 
  BatchFile, 
  GenerationState, 
  TopicConfig,
  Difficulty,
  BatchSummary,
  GenerationResult,
  LaTeXValidationResult
} from './lib/generation-types';
import {
  ALL_TOPICS,
  MATH_TOPICS,
  READING_TOPICS,
  AZURE_OPENAI_CONFIG,
  PATHS,
  PROMPT_VERSION,
  SOURCE_TAG,
  REVIEW_STATUS,
  TOTALS,
  DIFFICULTY_SCORES,
  TIME_ESTIMATES,
} from './lib/generation-config';
import { MATH_PROMPT_BUILDERS } from './lib/prompts/math-prompts';
import { READING_PROMPT_BUILDERS } from './lib/prompts/reading-prompts';
import { normalizeLatex, validateLatex } from './lib/normalize-latex';

const prisma = new PrismaClient();

// Initialize Azure OpenAI client
const openai = new AzureOpenAI({
  apiKey: AZURE_OPENAI_CONFIG.apiKey,
  endpoint: AZURE_OPENAI_CONFIG.endpoint,
  apiVersion: AZURE_OPENAI_CONFIG.apiVersion,
  deployment: AZURE_OPENAI_CONFIG.deployment,
});

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Ensure required directories exist
 */
function ensureDirectories() {
  const dirs = [
    PATHS.generatedBatches,
    PATHS.approved,
    PATHS.rejected,
    PATHS.htmlExport,
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Load or initialize generation state
 */
async function loadState(): Promise<GenerationState> {
  if (fs.existsSync(PATHS.stateFile)) {
    const data = fs.readFileSync(PATHS.stateFile, 'utf-8');
    return JSON.parse(data);
  }

  // Initialize new state
  const readingCount = await prisma.question.count({
    where: { moduleType: 'reading-writing', isActive: true },
  });
  const mathCount = await prisma.question.count({
    where: { moduleType: 'math', isActive: true },
  });

  const initialState: GenerationState = {
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    target: { reading: TOTALS.targetReading, math: TOTALS.targetMath },
    current: { reading: readingCount, math: mathCount },
    generated: { reading: 0, math: 0 },
    approved: { reading: 0, math: 0 },
    batches: [],
  };

  saveState(initialState);
  return initialState;
}

/**
 * Save generation state
 */
function saveState(state: GenerationState) {
  state.lastUpdatedAt = new Date().toISOString();
  fs.writeFileSync(PATHS.stateFile, JSON.stringify(state, null, 2));
}

// ============================================================================
// AZURE OPENAI API
// ============================================================================

/**
 * Call Azure OpenAI API
 */
async function callAzureOpenAI(
  systemPrompt: string,
  userPrompt: string,
  retryCount = 0
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: AZURE_OPENAI_CONFIG.deployment,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_completion_tokens: AZURE_OPENAI_CONFIG.maxTokens,
    });

    const content = response.choices[0].message.content || '';
    
    if (!content) {
      console.error('Empty response from API. Full response:', JSON.stringify(response, null, 2));
      throw new Error('Empty response from Azure OpenAI API');
    }
    
    return content;
  } catch (error: any) {
    if (error.status === 429 && retryCount < AZURE_OPENAI_CONFIG.maxRetries) {
      // Rate limit - wait and retry
      console.log(`  Rate limit hit, waiting 60s...`);
      await sleep(60000);
      return callAzureOpenAI(systemPrompt, userPrompt, retryCount + 1);
    }

    if (retryCount < AZURE_OPENAI_CONFIG.maxRetries) {
      console.log(`  API error, retrying in ${AZURE_OPENAI_CONFIG.retryDelay}ms...`);
      await sleep(AZURE_OPENAI_CONFIG.retryDelay);
      return callAzureOpenAI(systemPrompt, userPrompt, retryCount + 1);
    }

    throw new Error(`Azure OpenAI API failed after ${retryCount} retries: ${error.message}`);
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// QUESTION GENERATION
// ============================================================================

/**
 * Parse LLM response to JSON array
 */
function parseResponse(content: string): any[] {
  // Strip markdown code fences if present
  let cleaned = content.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '');
  }

  // Fix LaTeX backslashes for JSON parsing
  // Model might output single \, double \\, or quad \\\\ backslashes
  // We need exactly \\\\ for JSON strings containing \\ (which renders as \ after parsing)
  // Strategy: Normalize all backslash sequences first, then escape for JSON
  let fixedJson = cleaned;
  
  // Replace quad backslashes with a placeholder first
  fixedJson = fixedJson.replace(/\\\\\\\\/g, '<<<QUAD_BACKSLASH>>>');
  // Replace double backslashes with a placeholder
  fixedJson = fixedJson.replace(/\\\\/g, '<<<DOUBLE_BACKSLASH>>>');
  // Now any remaining single backslashes need to be escaped (unless valid JSON escape)
  fixedJson = fixedJson.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
  // Restore placeholders as proper JSON-escaped sequences
  fixedJson = fixedJson.replace(/<<<DOUBLE_BACKSLASH>>>/g, '\\\\\\\\');
  fixedJson = fixedJson.replace(/<<<QUAD_BACKSLASH>>>/g, '\\\\\\\\\\\\\\\\');

  try {
    const parsed = JSON.parse(fixedJson);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    // Fallback: Try to extract JSON with regex
    const jsonMatch = fixedJson.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        // Last attempt: Manual object extraction
        const objectsMatch = fixedJson.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
        if (objectsMatch) {
          try {
            return JSON.parse(`[${objectsMatch.join(',')}]`);
          } catch (e2) {
            console.error('Failed to parse extracted objects:', e2);
          }
        }
      }
    }
    
    // Log for debugging
    console.error('Failed to parse LLM response. First 500 chars:', content.substring(0, 500));
    console.error('After fix attempt:', fixedJson.substring(0, 500));
    throw new Error('Failed to parse JSON from LLM response');
  }
}

/**
 * Normalize correctAnswer (handle both letter and number format)
 */
function normalizeCorrectAnswer(answer: any): number {
  if (typeof answer === 'number') return answer;
  if (typeof answer === 'string') {
    const upper = answer.toUpperCase();
    if (upper === 'A') return 0;
    if (upper === 'B') return 1;
    if (upper === 'C') return 2;
    if (upper === 'D') return 3;
  }
  throw new Error(`Invalid correctAnswer format: ${answer}`);
}

/**
 * Validate question structure
 */
function validateQuestionStructure(q: any): string[] {
  const errors: string[] = [];

  if (!q.question || typeof q.question !== 'string') errors.push('Missing or invalid question');
  if (!Array.isArray(q.options) || q.options.length !== 4) errors.push('Must have exactly 4 options');
  if (q.correctAnswer === undefined || q.correctAnswer < 0 || q.correctAnswer > 3) {
    errors.push('correctAnswer must be 0-3');
  }
  if (!q.explanation || typeof q.explanation !== 'string') errors.push('Missing explanation');
  if (!q.difficulty || !['easy', 'medium', 'hard'].includes(q.difficulty)) {
    errors.push('Invalid difficulty');
  }
  if (!q.subtopic || typeof q.subtopic !== 'string') errors.push('Missing subtopic');

  // Check option prefixes
  const expectedPrefixes = ['A) ', 'B) ', 'C) ', 'D) '];
  q.options?.forEach((opt: string, i: number) => {
    if (!opt.startsWith(expectedPrefixes[i])) {
      errors.push(`Option ${i} missing prefix "${expectedPrefixes[i]}"`);
    }
  });

  return errors;
}

/**
 * Validate LaTeX in all text fields
 */
function validateQuestionLatex(q: GeneratedQuestion): LaTeXValidationResult {
  const invalidExpressions: Array<{ expression: string; error: string; location: string }> = [];

  // Extract and validate LaTeX from question
  const questionResult = validateLatex(q.question);
  if (!questionResult.isValid) {
    questionResult.errors?.forEach(err => {
      invalidExpressions.push({ expression: err.expression, error: err.error, location: 'question' });
    });
  }

  // Validate options
  q.options.forEach((opt, i) => {
    const optResult = validateLatex(opt);
    if (!optResult.isValid) {
      optResult.errors?.forEach(err => {
        invalidExpressions.push({
          expression: err.expression,
          error: err.error,
          location: `option-${['A', 'B', 'C', 'D'][i]}`,
        });
      });
    }
  });

  // Validate explanation
  const expResult = validateLatex(q.explanation);
  if (!expResult.isValid) {
    expResult.errors?.forEach(err => {
      invalidExpressions.push({ expression: err.expression, error: err.error, location: 'explanation' });
    });
  }

  return {
    isValid: invalidExpressions.length === 0,
    invalidExpressions,
  };
}

/**
 * Generate questions for a topic with a specific difficulty
 */
async function generateQuestions(
  topic: TopicConfig,
  difficulty: Difficulty,
  count: number,
  batchId: string
): Promise<GenerationResult> {
  console.log(`  Generating ${count} ${difficulty} questions for ${topic.id}...`);

  const promptBuilders = topic.moduleType === 'math' ? MATH_PROMPT_BUILDERS : READING_PROMPT_BUILDERS;
  const promptBuilder = promptBuilders[topic.id];

  if (!promptBuilder) {
    throw new Error(`No prompt builder found for topic: ${topic.id}`);
  }

  const { system, user } = promptBuilder('', difficulty, count);

  // Call Azure OpenAI
  const content = await callAzureOpenAI(system, user);

  // Parse response
  let questions: any[];
  try {
    questions = parseResponse(content);
  } catch (error: any) {
    return {
      success: false,
      questions: [],
      errors: [`Failed to parse JSON: ${error.message}`],
      retries: 0,
    };
  }

  // Process each question
  const validQuestions: GeneratedQuestion[] = [];
  const errors: string[] = [];

  for (const q of questions) {
    // Validate structure
    const structureErrors = validateQuestionStructure(q);
    if (structureErrors.length > 0) {
      errors.push(`Question structure invalid: ${structureErrors.join(', ')}`);
      continue;
    }

    // Normalize correctAnswer
    q.correctAnswer = normalizeCorrectAnswer(q.correctAnswer);

    // Normalize LaTeX in all fields
    q.question = normalizeLatex(q.question);
    q.options = q.options.map((opt: string) => normalizeLatex(opt));
    q.explanation = normalizeLatex(q.explanation);

    // Build full question object
    const generatedQuestion: GeneratedQuestion = {
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      moduleType: topic.moduleType,
      category: topic.category,
      subtopic: q.subtopic || topic.subtopics[0],
      difficulty,
      difficultyScore: DIFFICULTY_SCORES[difficulty],
      passage: q.passage || null,
      visualType: 'none',
      wrongAnswerExplanations: q.wrongAnswerExplanations || {},
      _batchId: batchId,
      _generatedAt: new Date().toISOString(),
      _promptVersion: PROMPT_VERSION,
      _validated: false,
      _approvalStatus: 'pending',
    };

    // Validate LaTeX
    const latexResult = validateQuestionLatex(generatedQuestion);
    if (!latexResult.isValid) {
      errors.push(
        `LaTeX validation failed: ${latexResult.invalidExpressions.map(e => `${e.location}: ${e.error}`).join('; ')}`
      );
      continue;
    }

    generatedQuestion._validated = true;
    validQuestions.push(generatedQuestion);
  }

  return {
    success: validQuestions.length > 0,
    questions: validQuestions,
    errors,
    retries: 0,
  };
}

/**
 * Generate a full batch (20 questions with difficulty distribution)
 */
async function generateBatch(topic: TopicConfig): Promise<BatchFile> {
  const batchNumber = Date.now();
  const batchId = `batch-${batchNumber.toString().padStart(3, '0')}-${topic.id}`;

  console.log(`\n📦 Generating batch: ${batchId}`);
  console.log(`Topic: ${topic.id}, Module: ${topic.moduleType}, Target: ${topic.batchSize}`);

  const allQuestions: GeneratedQuestion[] = [];
  const allErrors: string[] = [];

  // Calculate difficulty distribution
  const easyCount = Math.ceil(topic.batchSize * topic.difficulty.easy);
  const mediumCount = Math.ceil(topic.batchSize * topic.difficulty.medium);
  const hardCount = topic.batchSize - easyCount - mediumCount;

  // Generate each difficulty level
  for (const [difficulty, count] of [
    ['easy', easyCount],
    ['medium', mediumCount],
    ['hard', hardCount],
  ] as Array<[Difficulty, number]>) {
    const result = await generateQuestions(topic, difficulty, count, batchId);
    allQuestions.push(...result.questions);
    allErrors.push(...result.errors);

    // Delay between calls
    await sleep(AZURE_OPENAI_CONFIG.delayBetweenCalls);
  }

  const batchFile: BatchFile = {
    batchId,
    topic: topic.id,
    moduleType: topic.moduleType,
    generatedAt: new Date().toISOString(),
    promptVersion: PROMPT_VERSION,
    totalRequested: topic.batchSize,
    totalGenerated: allQuestions.length,
    totalValid: allQuestions.filter(q => q._validated).length,
    totalInvalid: allQuestions.length - allQuestions.filter(q => q._validated).length,
    questions: allQuestions,
  };

  // Save batch file
  const batchPath = path.join(PATHS.generatedBatches, `${batchId}.json`);
  fs.writeFileSync(batchPath, JSON.stringify(batchFile, null, 2));

  // Export batch HTML
  await exportBatchHTML(batchFile);

  console.log(`✅ Batch complete: ${allQuestions.length}/${topic.batchSize} valid questions`);
  if (allErrors.length > 0) {
    console.log(`⚠️  ${allErrors.length} errors:`, allErrors.slice(0, 3));
  }

  return batchFile;
}

// ============================================================================
// HTML EXPORT
// ============================================================================

/**
 * Export batch to standalone HTML for review
 */
async function exportBatchHTML(batch: BatchFile): Promise<void> {
  const htmlPath = path.join(PATHS.generatedBatches, `${batch.batchId}.html`);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Review: ${batch.batchId}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/contrib/auto-render.min.js"></script>
  <style>
    body { font-family: Georgia, serif; max-width: 900px; margin: 40px auto; padding: 0 20px; line-height: 1.6; }
    .header { background: #f0f4f8; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .header h1 { margin: 0 0 10px; color: #1a365d; }
    .header .meta { color: #4a5568; font-size: 14px; }
    .question { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 25px; margin-bottom: 25px; }
    .question-header { display: flex; justify-content: space-between; margin-bottom: 15px; }
    .question-number { font-weight: bold; font-size: 18px; color: #2d3748; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .badge.easy { background: #c6f6d5; color: #22543d; }
    .badge.medium { background: #fed7d7; color: #742a2a; }
    .badge.hard { background: #e2e8f0; color: #1a202c; }
    .question-text { font-size: 16px; margin: 15px 0; }
    .passage { background: #f7fafc; padding: 15px; border-left: 4px solid #4299e1; margin: 15px 0; font-size: 14px; }
    .options { list-style: none; padding: 0; }
    .options li { padding: 10px; margin: 8px 0; border-radius: 4px; background: #f7fafc; }
    .options li.correct { background: #c6f6d5; border-left: 4px solid #38a169; }
    .explanation { background: #fffaf0; padding: 15px; border-left: 4px solid #ed8936; margin-top: 15px; }
    .explanation-title { font-weight: bold; color: #7c2d12; margin-bottom: 8px; }
    footer { text-align: center; padding: 40px 0; color: #718096; font-size: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${batch.batchId}</h1>
    <div class="meta">
      Generated: ${new Date(batch.generatedAt).toLocaleString()} | 
      Topic: ${batch.topic} | 
      Module: ${batch.moduleType} | 
      Valid: ${batch.totalValid}/${batch.totalGenerated}
    </div>
  </div>

  ${batch.questions
    .map(
      (q, i) => `
  <div class="question">
    <div class="question-header">
      <span class="question-number">Question ${i + 1}</span>
      <span class="badge ${q.difficulty}">${q.difficulty.toUpperCase()}</span>
    </div>
    <div class="question-text">${q.question}</div>
    ${q.passage ? `<div class="passage">${q.passage}</div>` : ''}
    <ul class="options">
      ${q.options.map((opt, j) => `<li class="${j === q.correctAnswer ? 'correct' : ''}">${opt}</li>`).join('')}
    </ul>
    <div class="explanation">
      <div class="explanation-title">Explanation:</div>
      ${q.explanation}
    </div>
  </div>
`
    )
    .join('')}

  <footer>
    <p>Review this batch and approve or reject questions before importing to the database.</p>
  </footer>

  <script>
    document.addEventListener("DOMContentLoaded", function() {
      renderMathInElement(document.body, {
        delimiters: [
          {left: "$$", right: "$$", display: true},
          {left: "$", right: "$", display: false}
        ],
        throwOnError: false
      });
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(htmlPath, html);
  console.log(`📄 HTML exported: ${htmlPath}`);
}

/**
 * Export cumulative progress HTML (all approved questions so far)
 */
async function exportProgressHTML(): Promise<void> {
  console.log('\n📊 Exporting progress HTML...');
  
  // Read all approved batches
  const approvedBatches: BatchFile[] = [];
  if (fs.existsSync(PATHS.approved)) {
    const files = fs.readdirSync(PATHS.approved).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const data = fs.readFileSync(path.join(PATHS.approved, file), 'utf-8');
      approvedBatches.push(JSON.parse(data));
    }
  }

  const allQuestions = approvedBatches.flatMap(b => b.questions);
  const mathCount = allQuestions.filter(q => q.moduleType === 'math').length;
  const readingCount = allQuestions.filter(q => q.moduleType === 'reading-writing').length;

  const htmlPath = path.join(PATHS.htmlExport, `progress-${Date.now()}.html`);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QG800 Progress Report</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/contrib/auto-render.min.js"></script>
  <style>
    body { font-family: Georgia, serif; max-width: 1000px; margin: 40px auto; padding: 0 20px; line-height: 1.6; }
    .header { background: #f0f4f8; padding: 30px; border-radius: 8px; margin-bottom: 40px; text-align: center; }
    .header h1 { margin: 0 0 10px; color: #1a365d; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0; }
    .stat-card { background: white; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; }
    .stat-number { font-size: 48px; font-weight: bold; color: #2d3748; }
    .stat-label { color: #4a5568; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
    .question { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 25px; margin-bottom: 25px; }
    .question-header { display: flex; justify-content: space-between; margin-bottom: 15px; }
    .question-number { font-weight: bold; font-size: 18px; color: #2d3748; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .badge.easy { background: #c6f6d5; color: #22543d; }
    .badge.medium { background: #fed7d7; color: #742a2a; }
    .badge.hard { background: #e2e8f0; color: #1a202c; }
    .question-text { font-size: 16px; margin: 15px 0; }
    .passage { background: #f7fafc; padding: 15px; border-left: 4px solid #4299e1; margin: 15px 0; font-size: 14px; }
    .options { list-style: none; padding: 0; }
    .options li { padding: 10px; margin: 8px 0; border-radius: 4px; background: #f7fafc; }
    .options li.correct { background: #c6f6d5; border-left: 4px solid #38a169; }
    .explanation { background: #fffaf0; padding: 15px; border-left: 4px solid #ed8936; margin-top: 15px; }
    .explanation-title { font-weight: bold; color: #7c2d12; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 QG800 Progress Report</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
  </div>

  <div class="stats">
    <div class="stat-card">
      <div class="stat-number">${allQuestions.length}</div>
      <div class="stat-label">Total Generated</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${mathCount}</div>
      <div class="stat-label">Math Questions</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">${readingCount}</div>
      <div class="stat-label">Reading Questions</div>
    </div>
  </div>

  ${allQuestions
    .map(
      (q, i) => `
  <div class="question">
    <div class="question-header">
      <span class="question-number">Question ${i + 1}</span>
      <span class="badge ${q.difficulty}">${q.difficulty.toUpperCase()} | ${q.category}</span>
    </div>
    <div class="question-text">${q.question}</div>
    ${q.passage ? `<div class="passage">${q.passage}</div>` : ''}
    <ul class="options">
      ${q.options.map((opt, j) => `<li class="${j === q.correctAnswer ? 'correct' : ''}">${opt}</li>`).join('')}
    </ul>
    <div class="explanation">
      <div class="explanation-title">Explanation:</div>
      ${q.explanation}
    </div>
  </div>
`
    )
    .join('')}

  <script>
    document.addEventListener("DOMContentLoaded", function() {
      renderMathInElement(document.body, {
        delimiters: [
          {left: "$$", right: "$$", display: true},
          {left: "$", right: "$", display: false}
        ],
        throwOnError: false
      });
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(htmlPath, html);
  console.log(`✅ Progress HTML exported: ${htmlPath}`);
  console.log(`   Total: ${allQuestions.length} questions (${mathCount} math, ${readingCount} reading)`);
}

// ============================================================================
// CLI COMMANDS
// ============================================================================

/**
 * Command: generate --all
 * Generate all batches per the plan, with auto-checkpoint every 100 questions
 */
async function cmdGenerateAll() {
  ensureDirectories();
  const state = await loadState();

  console.log('\n🚀 Starting full generation plan (QG800)');
  console.log(`Target: ${TOTALS.generateMath} math + ${TOTALS.generateReading} reading = ${TOTALS.generateTotal} questions\n`);

  let totalGenerated = 0;

  for (const topic of ALL_TOPICS) {
    const batchCount = Math.ceil(topic.target / topic.batchSize);
    console.log(`\n🎯 Topic: ${topic.id} (${topic.target} questions, ${batchCount} batches)`);

    for (let i = 0; i < batchCount; i++) {
      const batch = await generateBatch(topic);

      // Update state
      const batchSummary: BatchSummary = {
        batchId: batch.batchId,
        topic: batch.topic,
        moduleType: batch.moduleType,
        generatedAt: batch.generatedAt,
        totalGenerated: batch.totalGenerated,
        totalValid: batch.totalValid,
        totalInvalid: batch.totalInvalid,
        status: 'pending',
      };

      state.batches.push(batchSummary);

      if (topic.moduleType === 'math') {
        state.generated.math += batch.totalValid;
      } else {
        state.generated.reading += batch.totalValid;
      }

      saveState(state);

      totalGenerated += batch.totalValid;

      // Auto-checkpoint every 100 questions
      if (totalGenerated >= 100 && totalGenerated % 100 <= batch.totalValid) {
        console.log(`\n⏸️  CHECKPOINT: ${totalGenerated} questions generated`);
        await exportProgressHTML();
        console.log(`\n▶️  Resuming generation...\n`);
      }
    }
  }

  console.log(`\n✅ All generation complete!`);
  console.log(`   Math: ${state.generated.math}`);
  console.log(`   Reading: ${state.generated.reading}`);
  console.log(`   Total: ${totalGenerated}\n`);
  
  // Final HTML export
  await exportProgressHTML();
}

/**
 * Command: generate --topic <topic> --count <count>
 */
async function cmdGenerateTopic(topicId: string, count?: number) {
  ensureDirectories();
  const state = await loadState();

  const topic = ALL_TOPICS.find(t => t.id === topicId);
  if (!topic) {
    console.error(`❌ Unknown topic: ${topicId}`);
    console.log(`Available topics: ${ALL_TOPICS.map(t => t.id).join(', ')}`);
    process.exit(1);
  }

  // Override batch size if count provided
  if (count) {
    topic.batchSize = count;
  }

  const batch = await generateBatch(topic);

  // Update state
  const batchSummary: BatchSummary = {
    batchId: batch.batchId,
    topic: batch.topic,
    moduleType: batch.moduleType,
    generatedAt: batch.generatedAt,
    totalGenerated: batch.totalGenerated,
    totalValid: batch.totalValid,
    totalInvalid: batch.totalInvalid,
    status: 'pending',
  };

  state.batches.push(batchSummary);

  if (topic.moduleType === 'math') {
    state.generated.math += batch.totalValid;
  } else {
    state.generated.reading += batch.totalValid;
  }

  saveState(state);

  console.log(`\n✅ Batch generated: ${batch.batchId}`);
  console.log(`   Review: ${PATHS.generatedBatches}/${batch.batchId}.html`);
}

/**
 * Command: status
 */
async function cmdStatus() {
  const state = await loadState();

  console.log('\n📊 QG800 Generation Status\n');
  console.log(`Started: ${new Date(state.startedAt).toLocaleString()}`);
  console.log(`Last Updated: ${new Date(state.lastUpdatedAt).toLocaleString()}\n`);

  console.log('Target:');
  console.log(`  Math: ${state.target.math}`);
  console.log(`  Reading: ${state.target.reading}`);
  console.log(`  Total: ${state.target.math + state.target.reading}\n`);

  console.log('Current (DB):');
  console.log(`  Math: ${state.current.math}`);
  console.log(`  Reading: ${state.current.reading}`);
  console.log(`  Total: ${state.current.math + state.current.reading}\n`);

  console.log('Generated:');
  console.log(`  Math: ${state.generated.math} / ${TOTALS.generateMath}`);
  console.log(`  Reading: ${state.generated.reading} / ${TOTALS.generateReading}`);
  console.log(`  Total: ${state.generated.math + state.generated.reading} / ${TOTALS.generateTotal}\n`);

  console.log('Approved:');
  console.log(`  Math: ${state.approved.math}`);
  console.log(`  Reading: ${state.approved.reading}`);
  console.log(`  Total: ${state.approved.math + state.approved.reading}\n`);

  console.log('Batches:');
  const pending = state.batches.filter(b => b.status === 'pending').length;
  const approved = state.batches.filter(b => b.status === 'approved').length;
  const rejected = state.batches.filter(b => b.status === 'rejected').length;
  console.log(`  Pending: ${pending}`);
  console.log(`  Approved: ${approved}`);
  console.log(`  Rejected: ${rejected}`);
  console.log(`  Total: ${state.batches.length}\n`);
}

/**
 * Command: approve --batch <batchId>
 */
async function cmdApproveBatch(batchId: string) {
  const batchPath = path.join(PATHS.generatedBatches, `${batchId}.json`);
  if (!fs.existsSync(batchPath)) {
    console.error(`❌ Batch not found: ${batchId}`);
    process.exit(1);
  }

  const batch: BatchFile = JSON.parse(fs.readFileSync(batchPath, 'utf-8'));

  // Move to approved folder
  const approvedPath = path.join(PATHS.approved, `${batchId}.json`);
  fs.copyFileSync(batchPath, approvedPath);
  fs.unlinkSync(batchPath);

  // Update state
  const state = await loadState();
  const batchSummary = state.batches.find(b => b.batchId === batchId);
  if (batchSummary) {
    batchSummary.status = 'approved';
    batchSummary.approvedAt = new Date().toISOString();

    if (batch.moduleType === 'math') {
      state.approved.math += batch.totalValid;
    } else {
      state.approved.reading += batch.totalValid;
    }

    saveState(state);
  }

  console.log(`✅ Batch approved: ${batchId}`);
  console.log(`   Moved to: ${approvedPath}`);
  console.log(`\nNext: Run import script to add to database`);
}

// ============================================================================
// MAIN CLI
// ============================================================================

const args = process.argv.slice(2);
const command = args[0];

(async () => {
  try {
    if (command === 'generate') {
      if (args[1] === '--all') {
        await cmdGenerateAll();
      } else if (args[1] === '--topic') {
        const topic = args[2];
        const countIdx = args.indexOf('--count');
        const count = countIdx >= 0 ? parseInt(args[countIdx + 1]) : undefined;
        await cmdGenerateTopic(topic, count);
      } else {
        console.error('Usage: generate --all OR generate --topic <topic> [--count <n>]');
        process.exit(1);
      }
    } else if (command === 'status') {
      await cmdStatus();
    } else if (command === 'approve') {
      const batchIdx = args.indexOf('--batch');
      if (batchIdx < 0) {
        console.error('Usage: approve --batch <batchId>');
        process.exit(1);
      }
      await cmdApproveBatch(args[batchIdx + 1]);
    } else {
      console.log('QG800 Question Generator\n');
      console.log('Commands:');
      console.log('  generate --all                          Generate all 371 questions');
      console.log('  generate --topic <topic> [--count <n>]  Generate batch for topic');
      console.log('  status                                  Show progress');
      console.log('  approve --batch <batchId>               Approve a batch');
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
