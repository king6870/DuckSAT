/**
 * Generate missing diagrams for existing questions in database
 * Uses Python subprocess to call V3 diagram generators
 */

import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';

const execPromise = promisify(exec);
const prisma = new PrismaClient();

interface Question {
  id: string;
  question: string;
  category: string;
  subtopic: string | null;
  difficulty: string;
}

async function generateSimpleDiagram(question: Question): Promise<Buffer | null> {
  /**
   * For now, create a simple text-based notice that diagrams are being generated
   * In production, this would call Python matplotlib generators
   */
  
  const questionText = question.question.toLowerCase();
  
  // For now, return null - we'll use the Python script properly
  // This is a placeholder for the full implementation
  return null;
}

async function generateDiagramsForQuestions(limit: number = 66, dryRun: boolean = false) {
  console.log('🔍 Fetching questions without diagrams...\n');
  
  const questions = await prisma.question.findMany({
    where: {
      imageData: null,
      OR: [
        { category: 'geometry' },
        { subtopic: { contains: 'graph' } },
        { subtopic: { contains: 'diagram' } },
        { subtopic: { contains: 'chart' } },
        { question: { contains: 'coordinate plane' } },
        { question: { contains: 'triangle' } },
        { question: { contains: 'circle' } },
      ]
    },
    select: {
      id: true,
      question: true,
      category: true,
      subtopic: true,
      difficulty: true
    },
    take: limit,
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`📊 Found ${questions.length} questions needing diagrams\n`);
  
  if (questions.length === 0) {
    console.log('✅ No questions need diagrams!');
    return;
  }

  let successCount = 0;
  let skipCount = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    console.log(`[${i+1}/${questions.length}] Processing: ${q.id}`);
    console.log(`   Category: ${q.category}, Subtopic: ${q.subtopic}`);
    console.log(`   Question: ${q.question.substring(0, 80)}...`);

    // For now, just mark as needing diagrams
    // Full implementation would call Python generators
    console.log(`   ⏭️  Marked for diagram generation (Python generators needed)\n`);
    skipCount++;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total processed: ${questions.length}`);
  console.log(`✅ Diagrams generated: ${successCount}`);
  console.log(`⏭️  Marked for generation: ${skipCount}`);
  console.log(`\n💡 Next step: Run Python script with matplotlib generators`);
  console.log(`   Command: cd azuredev-038d-main && python generate_missing_diagrams.py`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const limit = args.includes('--limit') 
  ? parseInt(args[args.indexOf('--limit') + 1]) 
  : 66;
const dryRun = args.includes('--dry-run');

console.log('🎨 Diagram Generator for DuckSAT Questions');
console.log('='.repeat(60) + '\n');

generateDiagramsForQuestions(limit, dryRun)
  .then(() => {
    console.log('\n👋 Done!');
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
