/**
 * Import V3 generated questions with diagrams into database
 */

import { PrismaClient } from '@prisma/client';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

const prisma = new PrismaClient();

interface V3Question {
  question: string;
  choices: string[];
  correctAnswer: string;
  solution: string;
  explanation: string;
  category?: string;
  subtopic?: string;
  difficulty?: string;
  visualSpec?: any;
  imageData?: string;  // base64 PNG data
}

async function importV3Questions(directory: string) {
  console.log(`📂 Reading questions from: ${directory}\n`);

  const files = await readdir(directory);
  const jsonFiles = files.filter(f => f.endsWith('.json') && f.includes('20260217_10'));

  console.log(`📊 Found ${jsonFiles.length} question files\n`);

  let imported = 0;
  let skipped = 0;

  for (const file of jsonFiles) {
    const filePath = join(directory, file);
    console.log(`📄 Processing: ${file}`);

    try {
      const content = await readFile(filePath, 'utf-8');
      const q: V3Question = JSON.parse(content);

      // Convert base64 to Buffer
      const imageData = q.imageData 
        ? Buffer.from(q.imageData, 'base64')
        : null;

      // Convert letter answer to index (A=0, B=1, C=2, D=3)
      const answerIndex = q.correctAnswer.charCodeAt(0) - 'A'.charCodeAt(0);

      const question = await prisma.question.create({
        data: {
          question: q.question,
          options: JSON.stringify(q.choices),
          correctAnswer: answerIndex,
          explanation: q.solution || q.explanation,
          difficulty: 'medium',
          category: 'geometry',
          subtopic: 'various',
          moduleType: 'math',
          timeEstimate: 2,
          tags: 'geometry,math',
          imageData: imageData,
          imageMimeType: imageData ? 'image/png' : null,
          imageAlt: imageData ? 'Question diagram' : null
        }
      });

      console.log(`   ✅ Imported with ID: ${question.id}`);
      console.log(`   📊 Has diagram: ${!!imageData}\n`);
      imported++;

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}\n`);
      skipped++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 IMPORT SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Imported: ${imported}`);
  console.log(`❌ Skipped: ${skipped}`);
  console.log(`📊 Total: ${jsonFiles.length}`);
}

const directory = process.argv[2] || '../azuredev-038d-main/generated_questions_v3';

console.log('🎨 V3 Question Importer');
console.log('='.repeat(60) + '\n');

importV3Questions(directory)
  .then(() => {
    console.log('\n✅ Import complete!');
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
