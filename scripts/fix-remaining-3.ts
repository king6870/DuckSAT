/**
 * Fix remaining 3 questions with double backslashes in options field
 */

import { PrismaClient } from '@prisma/client';
import { normalizeLatexInOptions } from './lib/normalize-latex';

const prisma = new PrismaClient();

const questionIds = [
  'cmlsq4jxk000kiu5o93hoeesa',
  'cmlsq4ted007viu5ocnusa9je',
  'cmlsq4tfl007wiu5odkixg281'
];

async function fixRemainingQuestions() {
  console.log('\n🔧 Fixing remaining 3 questions...\n');
  
  for (const id of questionIds) {
    const question = await prisma.question.findUnique({
      where: { id },
      select: { id: true, options: true }
    });
    
    if (!question) {
      console.log(`❌ Question ${id} not found`);
      continue;
    }
    
    console.log(`Question ${id}:`);
    console.log(`  Before: ${question.options.slice(0, 100)}...`);
    
    // Manually fix double backslashes in the options JSON string
    let fixed = question.options;
    
    // Replace \\times with \times (and similar for other commands)
    fixed = fixed.replace(/\\\\times/g, '\\times');
    fixed = fixed.replace(/\\\\frac/g, '\\frac');
    fixed = fixed.replace(/\\\\cdot/g, '\\cdot');
    fixed = fixed.replace(/\\\\sqrt/g, '\\sqrt');
    fixed = fixed.replace(/\\\\text/g, '\\text');
    
    console.log(`  After:  ${fixed.slice(0, 100)}...`);
    
    await prisma.question.update({
      where: { id },
      data: { options: fixed }
    });
    
    console.log(`  ✅ Fixed\n`);
  }
  
  console.log('✅ All 3 questions fixed!\n');
  await prisma.$disconnect();
}

fixRemainingQuestions();
