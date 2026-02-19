/**
 * Import 50 generated questions to database
 * Reads JSON files from generated-questions/ and imports via Prisma
 * 
 * Usage: npx tsx scripts/import-50-questions.ts
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface QuestionJSON {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  category: string;
  subtopic?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  moduleType: 'math' | 'reading-writing';
  passage?: string;
  chartData?: string;
  visualType?: string;
}

async function importQuestions() {
  console.log('📦 Importing 50 questions to database...\n');

  // Find generated question files
  const questionsDir = path.join(__dirname, '..', '..', 'azuredev-038d-main', 'generated-questions');
  
  if (!fs.existsSync(questionsDir)) {
    console.error(`❌ Directory not found: ${questionsDir}`);
    console.log('💡 Run question generation first: cd azuredev-038d-main && python sat_generator_v3.py --math 25 --reading 25');
    process.exit(1);
  }

  const files = fs.readdirSync(questionsDir)
    .filter(f => f.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    console.error('❌ No JSON files found in generated-questions/');
    process.exit(1);
  }

  console.log(`Found ${files.length} question files\n`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(questionsDir, file), 'utf-8');
      const question = JSON.parse(content) as QuestionJSON;

      // Check if question already exists (by question text)
      const existing = await prisma.question.findFirst({
        where: {
          question: question.question
        }
      });

      if (existing) {
        console.log(`⏭️  Skipped (duplicate): ${file}`);
        skipped++;
        continue;
      }

      // Import question
      await prisma.question.create({
        data: {
          question: question.question,
          passage: question.passage || null,
          options: JSON.stringify(question.options),
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          moduleType: question.moduleType,
          category: question.category,
          subtopic: question.subtopic || null,
          difficulty: question.difficulty,
          isActive: true,
          generatedBy: 'v3-generator',
          generationModel: 'gpt-5-nano',
          chartData: question.chartData || null,
          // Note: visualType column may not exist yet (requires migration)
          // visualType: question.visualType || null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      console.log(`✅ Imported: ${file} (${question.moduleType} - ${question.category})`);
      imported++;

    } catch (error) {
      console.error(`❌ Failed to import ${file}: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }

  await prisma.$disconnect();

  console.log('\n' + '='.repeat(70));
  console.log('IMPORT SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Imported: ${imported}`);
  console.log(`⏭️  Skipped (duplicates): ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total processed: ${files.length}`);
  console.log('='.repeat(70));

  if (imported > 0) {
    console.log('\n💡 Verify in Prisma Studio: npm run db:studio');
    console.log('💡 Test API: curl "http://localhost:3000/api/questions/practice?moduleType=math&count=25"');
  }
}

importQuestions().catch((error) => {
  console.error('Fatal error:', error);
  prisma.$disconnect();
  process.exit(1);
});
