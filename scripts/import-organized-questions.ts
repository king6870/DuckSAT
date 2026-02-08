#!/usr/bin/env node
/**
 * Import Organized Questions Script
 * 
 * Imports questions from organized-questions folder into the database.
 * Handles duplicate detection and image storage.
 * 
 * Input:  organized-questions/ (structured folders)
 * Output: Questions in PostgreSQL database via Prisma
 * 
 * Usage:
 *   npx tsx scripts/import-organized-questions.ts
 *   npm run questions:import
 *   
 * Options:
 *   --source <path>        Source folder (default: organized-questions)
 *   --skip-duplicates      Skip questions that already exist (default)
 *   --update-existing      Update existing questions instead of skipping
 *   --dry-run             Preview import without making changes
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface EnhancedMetadata {
  id: string;
  timestamp: string;
  question: string;
  choices: string[];
  correctAnswer: string;
  correctAnswerIndex: number;
  answerValue: string;
  explanation: string;
  diagramDescription?: string;
  hasDiagram: boolean;
  moduleType: string;
  category: string;
  subtopic?: string;
  difficulty: string;
  timeEstimate: number;
  source: string;
  tags: string[];
  validation?: {
    status?: string;
    geometricallyValid?: boolean;
    questionDiagramMatch?: boolean;
    solvable?: boolean;
    terminologyCorrect?: boolean;
    warnings?: string;
  };
  verification?: {
    qualityScore?: number;
    answerCorrect?: boolean;
    recommendation?: string;
  };
}

// Parse command line arguments
function parseArgs(): {
  sourceFolder: string;
  skipDuplicates: boolean;
  updateExisting: boolean;
  dryRun: boolean;
} {
  const args = process.argv.slice(2);
  
  let sourceFolder = path.join(process.cwd(), 'organized-questions');
  let skipDuplicates = true;
  let updateExisting = false;
  let dryRun = false;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' && i + 1 < args.length) {
      sourceFolder = path.resolve(args[i + 1]);
      i++;
    } else if (args[i] === '--skip-duplicates') {
      skipDuplicates = true;
      updateExisting = false;
    } else if (args[i] === '--update-existing') {
      updateExisting = true;
      skipDuplicates = false;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }
  
  return { sourceFolder, skipDuplicates, updateExisting, dryRun };
}

// Check if question already exists in database
async function questionExists(questionText: string): Promise<boolean> {
  const existing = await prisma.question.findFirst({
    where: {
      question: questionText
    }
  });
  return existing !== null;
}

// Find existing question by text
async function findExistingQuestion(questionText: string) {
  return await prisma.question.findFirst({
    where: {
      question: questionText
    }
  });
}

// Read metadata from question folder
function readMetadata(questionFolder: string): EnhancedMetadata | null {
  const metadataPath = path.join(questionFolder, 'metadata.json');
  
  if (!fs.existsSync(metadataPath)) {
    console.error(`  ❌ metadata.json not found`);
    return null;
  }
  
  try {
    const content = fs.readFileSync(metadataPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`  ❌ Error reading metadata.json:`, error);
    return null;
  }
}

// Read diagram image if exists
function readDiagram(questionFolder: string): Buffer | null {
  const diagramPath = path.join(questionFolder, 'diagram.png');
  
  if (!fs.existsSync(diagramPath)) {
    return null;
  }
  
  try {
    return fs.readFileSync(diagramPath);
  } catch (error) {
    console.error(`  ⚠️  Warning: Could not read diagram.png:`, error);
    return null;
  }
}

// Import a single question
async function importQuestion(
  questionFolder: string, 
  metadata: EnhancedMetadata,
  updateExisting: boolean,
  dryRun: boolean
): Promise<'success' | 'duplicate' | 'updated' | 'error'> {
  
  try {
    // Check if question already exists
    const exists = await questionExists(metadata.question);
    
    if (exists) {
      if (updateExisting) {
        if (dryRun) {
          console.log(`  🔄 Would update existing question`);
          return 'updated';
        }
        
        // Find and update existing question
        const existing = await findExistingQuestion(metadata.question);
        if (!existing) {
          console.error(`  ❌ Could not find existing question to update`);
          return 'error';
        }
        
        // Read diagram if exists
        const diagramBuffer = readDiagram(questionFolder);
        
        await prisma.question.update({
          where: { id: existing.id },
          data: {
            options: metadata.choices,
            correctAnswer: metadata.correctAnswerIndex,
            explanation: metadata.explanation,
            moduleType: metadata.moduleType,
            category: metadata.category,
            subtopic: metadata.subtopic || null,
            difficulty: metadata.difficulty,
            timeEstimate: metadata.timeEstimate,
            imageData: diagramBuffer,
            imageMimeType: diagramBuffer ? 'image/png' : null,
            imageAlt: metadata.diagramDescription || null,
            source: metadata.source,
            tags: metadata.tags,
            reviewStatus: metadata.verification?.recommendation === 'APPROVE' 
              ? 'approved' 
              : 'pending',
            reviewRating: metadata.verification?.qualityScore || null,
            reviewComments: metadata.validation?.status || null,
            updatedAt: new Date()
          }
        });
        
        console.log(`  ✅ Updated existing question`);
        return 'updated';
      } else {
        console.log(`  ⏭️  Skipped (duplicate)`);
        return 'duplicate';
      }
    }
    
    if (dryRun) {
      console.log(`  ✨ Would import new question`);
      return 'success';
    }
    
    // Read diagram if exists
    const diagramBuffer = readDiagram(questionFolder);
    
    if (diagramBuffer) {
      console.log(`  📷 Diagram loaded (${(diagramBuffer.length / 1024).toFixed(1)} KB)`);
    }
    
    // Create new question in database
    await prisma.question.create({
      data: {
        question: metadata.question,
        options: metadata.choices,
        correctAnswer: metadata.correctAnswerIndex,
        explanation: metadata.explanation,
        moduleType: metadata.moduleType,
        category: metadata.category,
        subtopic: metadata.subtopic || null,
        difficulty: metadata.difficulty,
        timeEstimate: metadata.timeEstimate,
        imageData: diagramBuffer,
        imageMimeType: diagramBuffer ? 'image/png' : null,
        imageAlt: metadata.diagramDescription || null,
        source: metadata.source,
        tags: metadata.tags,
        isActive: true,
        reviewStatus: metadata.verification?.recommendation === 'APPROVE' 
          ? 'approved' 
          : 'pending',
        reviewRating: metadata.verification?.qualityScore || null,
        reviewComments: metadata.validation?.status || null
      }
    });
    
    console.log(`  ✅ Imported successfully`);
    return 'success';
    
  } catch (error) {
    console.error(`  ❌ Error importing:`, error);
    return 'error';
  }
}

// Main import function
async function importOrganizedQuestions() {
  const options = parseArgs();
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Question Import Script                                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  if (options.dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }
  
  console.log(`📂 Source folder: ${options.sourceFolder}`);
  console.log(`🔄 Mode: ${options.updateExisting ? 'Update existing' : 'Skip duplicates'}\n`);
  
  // Check if source folder exists
  if (!fs.existsSync(options.sourceFolder)) {
    console.error(`❌ Source folder not found: ${options.sourceFolder}`);
    console.log('\nPlease run the organization script first:');
    console.log('  npm run questions:organize');
    process.exit(1);
  }
  
  // Find all question folders
  const entries = fs.readdirSync(options.sourceFolder);
  const questionFolders = entries
    .filter(e => {
      const fullPath = path.join(options.sourceFolder, e);
      return fs.statSync(fullPath).isDirectory() && e.startsWith('question-');
    })
    .sort(); // Sort to ensure consistent order
  
  console.log(`📝 Found ${questionFolders.length} question folders\n`);
  
  let successCount = 0;
  let duplicateCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  
  // Process each question folder
  for (let i = 0; i < questionFolders.length; i++) {
    const folderName = questionFolders[i];
    const questionFolder = path.join(options.sourceFolder, folderName);
    
    console.log(`[${i + 1}/${questionFolders.length}] Importing ${folderName}...`);
    
    try {
      // Read metadata
      const metadata = readMetadata(questionFolder);
      
      if (!metadata) {
        errorCount++;
        console.log('');
        continue;
      }
      
      // Show question preview
      const questionPreview = metadata.question.length > 60 
        ? metadata.question.substring(0, 60) + '...'
        : metadata.question;
      console.log(`  📄 "${questionPreview}"`);
      console.log(`  🏷️  ${metadata.moduleType} > ${metadata.category} > ${metadata.difficulty}`);
      
      // Import question
      const result = await importQuestion(
        questionFolder, 
        metadata, 
        options.updateExisting,
        options.dryRun
      );
      
      switch (result) {
        case 'success':
          successCount++;
          break;
        case 'duplicate':
          duplicateCount++;
          break;
        case 'updated':
          updatedCount++;
          break;
        case 'error':
          errorCount++;
          break;
      }
      
      console.log('');
      
    } catch (error) {
      errorCount++;
      console.error(`  ❌ Unexpected error:`, error);
      console.log('');
    }
  }
  
  // Print summary
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Import Summary                                         ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  
  if (options.dryRun) {
    console.log('║ ⚠️  DRY RUN - No actual changes made                      ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
  }
  
  console.log(`║ ✅ Imported:    ${String(successCount).padStart(3)}                                    ║`);
  console.log(`║ 🔄 Updated:     ${String(updatedCount).padStart(3)}                                    ║`);
  console.log(`║ ⏭️  Duplicates:  ${String(duplicateCount).padStart(3)}                                    ║`);
  console.log(`║ ❌ Errors:      ${String(errorCount).padStart(3)}                                    ║`);
  console.log(`║ 📊 Total:       ${String(questionFolders.length).padStart(3)}                                    ║`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  if (!options.dryRun && (successCount > 0 || updatedCount > 0)) {
    console.log('✨ Questions are now available in the DuckSAT practice tests!\n');
  }
  
  if (errorCount > 0) {
    console.log('⚠️  Some questions failed to import. Check errors above.\n');
    process.exit(1);
  }
}

// Run the script
importOrganizedQuestions()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
