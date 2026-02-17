import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface V3Question {
  question: string;
  choices: string[];
  correctAnswer: string;
  solution: string;
  explanation: string;
  imageData?: string;
  imageAlt?: string;
  visualType?: string;
  subtopic?: string;
  difficultyScore?: number;
}

const files = [
  'math_01_20260217_102937.json',
  'math_02_20260217_103032.json',
  'math_03_20260217_103104.json'
];

const questionsDir = path.join(process.cwd(), '..', 'azuredev-038d-main', 'generated_questions_v3');

async function importVerifiedQuestions() {
  console.log('📥 Importing 3 VERIFIED questions with UNIQUE diagrams\n');

  let imported = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = path.join(questionsDir, file);
    
    console.log(`📄 Processing: ${file}`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  File not found, skipping\n`);
      skipped++;
      continue;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as V3Question;

    // Verify imageData exists
    if (!data.imageData) {
      console.log(`   ❌ No imageData found, skipping for safety\n`);
      skipped++;
      continue;
    }

    // Convert correctAnswer from letter to index
    const answerLetter = data.correctAnswer.replace(/[^A-D]/g, '');
    const correctAnswerIndex = answerLetter.charCodeAt(0) - 'A'.charCodeAt(0);

    try {
      const question = await prisma.question.create({
        data: {
          question: data.question,
          category: 'Math',
          moduleType: 'math',
          difficulty: 'medium',
          options: JSON.stringify(data.choices), // Convert array to JSON string
          correctAnswer: correctAnswerIndex,
          explanation: data.solution,
          imageData: Buffer.from(data.imageData, 'base64'),
          imageAlt: data.imageAlt || 'Diagram for geometry question',
          timeEstimate: 2,
          tags: `geometry,${data.subtopic || 'coordinate-geometry'}`,
          isActive: true
        }
      });

      console.log(`   ✅ Imported with ID: ${question.id}`);
      console.log(`   📊 Has diagram: ${!!question.imageData}`);
      console.log(`   📏 Image size: ${data.imageData.length.toLocaleString()} chars\n`);
      
      imported++;
    } catch (error) {
      console.log(`   ❌ Import failed: ${error instanceof Error ? error.message : error}\n`);
      skipped++;
    }
  }

  console.log('═'.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('═'.repeat(60));
  console.log(`✅ Imported: ${imported}`);
  console.log(`⚠️  Skipped: ${skipped}`);
  console.log(`📊 Total: ${imported + skipped}\n`);

  if (imported === 3) {
    console.log('✅ SUCCESS: All 3 verified questions imported!');
    console.log('📊 Next: Verify database has unique diagrams\n');
  } else {
    console.log('⚠️  WARNING: Not all questions imported');
    console.log('⚠️  Check errors above\n');
  }

  await prisma.$disconnect();
}

importVerifiedQuestions().catch(console.error);
