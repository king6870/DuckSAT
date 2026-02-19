#!/usr/bin/env node
/**
 * Import Generated V2 Questions to Azure SQL Database ONLY
 * 
 * This script imports questions from the generated_questions_v2 folder
 * directly into the Azure SQL database (NOT PostgreSQL).
 * 
 * ⚠️ CRITICAL: This script ONLY uses Azure SQL credentials
 * 
 * Input:  azuredev-038d-main/generated_questions_v2/*.json
 * Output: Questions in Azure SQL database
 * 
 * Usage:
 *   npx tsx scripts/import-generated-v2-questions-azure.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// ⚠️ FORCE Azure SQL connection - Override any other DATABASE_URL
const AZURE_SQL_CONNECTION = 'sqlserver://db-ducksat.database.windows.net:1433;database=DuckSAT_DB;user=lionvihaan;password=Microsoft757;encrypt=true;trustServerCertificate=false;loginTimeout=30;connection_limit=5;pool_timeout=60';

console.log('\n🔒 AZURE SQL ONLY MODE - Connecting to Azure SQL Database');
console.log(`📍 Server: db-ducksat.database.windows.net`);
console.log(`📍 Database: DuckSAT_DB\n`);

// Initialize Prisma with AZURE SQL ONLY - with connection pooling and timeout settings
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: AZURE_SQL_CONNECTION
    }
  },
  log: ['error', 'warn']
});

interface MathQuestion {
  type: 'math';
  question: string;
  choices: string[];
  diagram_description?: string;
  diagram_base64?: string;
  correct_answer: string;
  explanation: string;
  solution?: string;
}

interface ReadingQuestion {
  type: 'reading';
  passage: string;
  passage_title?: string;
  passage_author?: string;
  question: string;
  choices: string[];
  correct_answer: string;
  explanation: string;
  line_reference?: string;
}

type GeneratedQuestion = MathQuestion | ReadingQuestion;

// Convert choice letter to index (A=0, B=1, C=2, D=3)
function choiceLetterToIndex(letter: string): number {
  const map: { [key: string]: number } = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
  return map[letter.toUpperCase()] || 0;
}

// Check if question already exists (DISABLED for SQL Server - TEXT type comparison issue)
async function questionExists(questionText: string): Promise<boolean> {
  // SQL Server doesn't support TEXT = NVARCHAR comparison
  // For initial import, we'll skip duplicate checking
  return false;
  
  /* Original code - causes SQL Server error:
  const existing = await prisma.question.findFirst({
    where: {
      question: questionText
    }
  });
  return existing !== null;
  */
}

// Import a single math question
async function importMathQuestion(data: MathQuestion, filename: string): Promise<'success' | 'duplicate' | 'error'> {
  try {
    // Check for duplicates
    if (await questionExists(data.question)) {
      console.log(`  ⚠️  Duplicate: ${filename}`);
      return 'duplicate';
    }

    // Convert base64 diagram to Buffer
    let diagramBuffer: Buffer | null = null;
    if (data.diagram_base64) {
      try {
        diagramBuffer = Buffer.from(data.diagram_base64, 'base64');
      } catch (error) {
        console.warn(`  ⚠️  Could not decode diagram for ${filename}`);
      }
    }

    // Map choices to options array
    const options = data.choices;
    const correctAnswerIndex = choiceLetterToIndex(data.correct_answer);

    // Create question in Azure SQL
    await prisma.question.create({
      data: {
        question: data.question,
        moduleType: 'math',
        difficulty: 'medium', // Default, can be enhanced later
        category: 'geometry', // Default based on diagram presence
        options: JSON.stringify(options),
        correctAnswer: correctAnswerIndex,
        explanation: data.explanation || data.solution || 'No explanation provided',
        imageData: diagramBuffer,
        imageMimeType: diagramBuffer ? 'image/png' : null,
        imageAlt: data.diagram_description || 'Math diagram',
        timeEstimate: 120, // 2 minutes for math questions
        source: 'SAT Generator V2',
        tags: JSON.stringify(['generated', 'v2', 'math', 'enhanced']),
        reviewStatus: 'pending',
        isActive: true
      }
    });

    console.log(`  ✅ Imported: ${filename}`);
    return 'success';

  } catch (error) {
    console.error(`  ❌ Error importing ${filename}:`, error);
    return 'error';
  }
}

// Import a single reading question
async function importReadingQuestion(data: ReadingQuestion, filename: string): Promise<'success' | 'duplicate' | 'error'> {
  try {
    // Check for duplicates
    if (await questionExists(data.question)) {
      console.log(`  ⚠️  Duplicate: ${filename}`);
      return 'duplicate';
    }

    // Map choices to options array
    const options = data.choices;
    const correctAnswerIndex = choiceLetterToIndex(data.correct_answer);

    // Create question in Azure SQL
    await prisma.question.create({
      data: {
        question: data.question,
        passage: data.passage || null,
        moduleType: 'reading-writing',
        difficulty: 'medium',
        category: 'reading-comprehension',
        options: JSON.stringify(options),
        correctAnswer: correctAnswerIndex,
        explanation: data.explanation,
        timeEstimate: 90, // 1.5 minutes for reading questions
        source: data.passage_title 
          ? `SAT Generator V2 - ${data.passage_title}`
          : 'SAT Generator V2',
        tags: JSON.stringify(['generated', 'v2', 'reading', 'enhanced']),
        reviewStatus: 'pending',
        isActive: true
      }
    });

    console.log(`  ✅ Imported: ${filename}`);
    return 'success';

  } catch (error) {
    console.error(`  ❌ Error importing ${filename}:`, error);
    return 'error';
  }
}

// Main import function
async function importAllQuestions() {
  const sourceDir = path.join(process.cwd(), '..', 'azuredev-038d-main', 'generated_questions_v2');
  
  console.log(`📂 Source Directory: ${sourceDir}\n`);

  if (!fs.existsSync(sourceDir)) {
    console.error(`❌ Source directory not found: ${sourceDir}`);
    process.exit(1);
  }

  // Get all JSON files
  const files = fs.readdirSync(sourceDir)
    .filter(f => f.endsWith('.json'))
    .sort();

  let successCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;

  console.log(`📊 Found ${files.length} JSON files\n`);
  console.log(`═══════════════════════════════════════════════════════════`);
  console.log(`Starting import to Azure SQL Database...`);
  console.log(`═══════════════════════════════════════════════════════════\n`);

  for (const file of files) {
    const filePath = path.join(sourceDir, file);
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data: GeneratedQuestion = JSON.parse(content);

      let result: 'success' | 'duplicate' | 'error';

      if (data.type === 'math') {
        result = await importMathQuestion(data as MathQuestion, file);
      } else if (data.type === 'reading') {
        result = await importReadingQuestion(data as ReadingQuestion, file);
      } else {
        console.log(`  ⚠️  Unknown type: ${file}`);
        errorCount++;
        continue;
      }

      if (result === 'success') successCount++;
      else if (result === 'duplicate') duplicateCount++;
      else errorCount++;

    } catch (error) {
      console.error(`  ❌ Error processing ${file}:`, error);
      errorCount++;
    }
  }

  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`IMPORT COMPLETE`);
  console.log(`═══════════════════════════════════════════════════════════`);
  console.log(`✅ Imported:   ${successCount}`);
  console.log(`⚠️  Duplicates: ${duplicateCount}`);
  console.log(`❌ Errors:     ${errorCount}`);
  console.log(`📊 Total:      ${files.length}`);
  console.log(`\n🔒 Database:   Azure SQL (DuckSAT_DB)`);
  console.log(`═══════════════════════════════════════════════════════════\n`);
}

// Run import with error handling
async function main() {
  try {
    // Verify Azure SQL connection first
    console.log('🔍 Verifying Azure SQL connection...');
    await prisma.$connect();
    console.log('✅ Connected to Azure SQL successfully\n');

    await importAllQuestions();

  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
