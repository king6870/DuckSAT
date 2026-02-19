/**
 * Final LaTeX Database Migration
 * 
 * One-time migration to normalize all LaTeX expressions in the database.
 * 
 * What it does:
 * 1. Creates backup of all questions
 * 2. Normalizes LaTeX in question, explanation, options, passage, wrongAnswerExplanations
 * 3. Updates database with clean LaTeX
 * 4. Generates migration report
 * 
 * Safety:
 * - Creates backup before any changes
 * - Normalization is idempotent (safe to re-run)
 * - Validates each change
 * 
 * Usage: tsx scripts/migrate-latex-final.ts
 * 
 * @see docs/specs/SPEC-LATEX-001.md Section 5.2
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import {
  normalizeLatex,
  normalizeLatexInOptions,
  normalizeLatexInExplanations
} from './lib/normalize-latex';

const prisma = new PrismaClient();

interface MigrationStats {
  totalQuestions: number;
  processed: number;
  modified: number;
  skipped: number;
  errors: number;
  modifiedByField: {
    question: number;
    options: number;
    explanation: number;
    passage: number;
    wrongAnswerExplanations: number;
  };
  changes: Array<{
    questionId: string;
    field: string;
    before: string;
    after: string;
  }>;
}

async function createBackup(): Promise<string> {
  console.log('\n📦 Creating backup...');
  
  try {
    const questions = await prisma.question.findMany({
      where: { isActive: true }
    });
    
    const backupPath = path.join(process.cwd(), 'backup-pre-migration.json');
    fs.writeFileSync(backupPath, JSON.stringify(questions, null, 2));
    
    console.log(`✅ Backup created: ${backupPath}`);
    console.log(`   ${questions.length} questions backed up\n`);
    
    return backupPath;
  } catch (error: any) {
    console.error('❌ Backup failed:', error.message);
    throw error;
  }
}

async function migrateLatex(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalQuestions: 0,
    processed: 0,
    modified: 0,
    skipped: 0,
    errors: 0,
    modifiedByField: {
      question: 0,
      options: 0,
      explanation: 0,
      passage: 0,
      wrongAnswerExplanations: 0
    },
    changes: []
  };
  
  try {
    console.log('🔄 Starting migration...\n');
    
    // Fetch all active questions
    const questions = await prisma.question.findMany({
      where: { isActive: true }
    });
    
    stats.totalQuestions = questions.length;
    console.log(`📊 Total questions: ${stats.totalQuestions}\n`);
    
    // Process each question
    for (const question of questions) {
      try {
        stats.processed++;
        
        // Normalize each field
        const normalizedQuestion = normalizeLatex(question.question);
        const normalizedExplanation = normalizeLatex(question.explanation);
        const normalizedOptions = normalizeLatexInOptions(question.options);
        const normalizedPassage = question.passage ? normalizeLatex(question.passage) : null;
        const normalizedWrongExplanations = normalizeLatexInExplanations(question.wrongAnswerExplanations);
        
        // Check what changed
        const changes: Array<{ field: string; before: string; after: string }> = [];
        
        if (normalizedQuestion !== question.question) {
          changes.push({ field: 'question', before: question.question, after: normalizedQuestion });
          stats.modifiedByField.question++;
        }
        
        if (normalizedExplanation !== question.explanation) {
          changes.push({ field: 'explanation', before: question.explanation, after: normalizedExplanation });
          stats.modifiedByField.explanation++;
        }
        
        if (normalizedOptions !== question.options) {
          changes.push({ field: 'options', before: question.options, after: normalizedOptions });
          stats.modifiedByField.options++;
        }
        
        if (question.passage && normalizedPassage !== question.passage) {
          changes.push({ field: 'passage', before: question.passage, after: normalizedPassage });
          stats.modifiedByField.passage++;
        }
        
        if (question.wrongAnswerExplanations && normalizedWrongExplanations !== question.wrongAnswerExplanations) {
          changes.push({ field: 'wrongAnswerExplanations', before: question.wrongAnswerExplanations, after: normalizedWrongExplanations });
          stats.modifiedByField.wrongAnswerExplanations++;
        }
        
        // If anything changed, update the database
        if (changes.length > 0) {
          stats.modified++;
          
          await prisma.question.update({
            where: { id: question.id },
            data: {
              question: normalizedQuestion,
              explanation: normalizedExplanation,
              options: normalizedOptions,
              passage: normalizedPassage,
              wrongAnswerExplanations: normalizedWrongExplanations
            }
          });
          
          // Log changes (store up to first 100 for report)
          if (stats.changes.length < 100) {
            for (const change of changes) {
              stats.changes.push({
                questionId: question.id,
                field: change.field,
                before: change.before.slice(0, 100), // Truncate for readability
                after: change.after.slice(0, 100)
              });
            }
          }
          
          // Progress indicator every 10 questions
          if (stats.modified % 10 === 0) {
            console.log(`   ✓ Modified ${stats.modified} questions...`);
          }
        } else {
          stats.skipped++;
        }
        
      } catch (error: any) {
        stats.errors++;
        console.error(`   ❌ Error processing question ${question.id}:`, error.message);
      }
    }
    
    return stats;
    
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  }
}

function printReport(stats: MigrationStats) {
  console.log('\n\n=== LaTeX Migration Report ===\n');
  console.log(`Total questions: ${stats.totalQuestions}`);
  console.log(`Processed: ${stats.processed}`);
  console.log(`Modified: ${stats.modified}`);
  console.log(`Skipped (clean): ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);
  
  console.log('\nModified by field:');
  console.log(`  question: ${stats.modifiedByField.question}`);
  console.log(`  options: ${stats.modifiedByField.options}`);
  console.log(`  explanation: ${stats.modifiedByField.explanation}`);
  console.log(`  passage: ${stats.modifiedByField.passage}`);
  console.log(`  wrongAnswerExplanations: ${stats.modifiedByField.wrongAnswerExplanations}`);
  
  // Show sample changes
  if (stats.changes.length > 0) {
    console.log('\n\nSample changes (first 5):');
    for (let i = 0; i < Math.min(5, stats.changes.length); i++) {
      const change = stats.changes[i];
      console.log(`\n  Question ${change.questionId} - ${change.field}:`);
      console.log(`    Before: ${change.before}${change.before.length >= 100 ? '...' : ''}`);
      console.log(`    After:  ${change.after}${change.after.length >= 100 ? '...' : ''}`);
    }
  }
  
  console.log('\n');
  
  if (stats.errors === 0) {
    console.log('✅ Migration completed successfully!\n');
    console.log('Next step: Run validation script to verify results:');
    console.log('  tsx scripts/validate-latex-final.ts\n');
  } else {
    console.log(`❌ Migration completed with ${stats.errors} errors.\n`);
  }
}

async function runMigration() {
  console.log('\n🚀 LaTeX Database Migration');
  console.log('==========================\n');
  console.log('This will normalize all LaTeX expressions in the database.');
  console.log('A backup will be created first.\n');
  
  try {
    // Step 1: Create backup
    const backupPath = await createBackup();
    
    // Step 2: Run migration
    const stats = await migrateLatex();
    
    // Step 3: Print report
    printReport(stats);
    
    // Return success
    return stats.errors === 0;
    
  } catch (error: any) {
    console.error('\n💥 Fatal error during migration:', error.message);
    console.error('\nThe database has NOT been modified.');
    console.error('If backup was created, it can be restored manually.\n');
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
runMigration()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
