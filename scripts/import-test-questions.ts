import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function importTestQuestions() {
  try {
    console.log('\n📥 Importing 10 test questions from generated_questions_v3/...\n');

    const questionsDir = path.join('..', 'azuredev-038d-main', 'generated_questions_v3');
    
    // The 10 test questions
    const testFiles = [
      'math_01_20260217_111651.json',
      'math_02_20260217_111811.json',
      'math_03_20260217_111837.json',
      'math_04_20260217_111914.json',
      'math_05_20260217_111948.json',
      'math_06_20260217_112022.json',
      'math_07_20260217_112050.json',
      'math_08_20260217_112117.json',
      'math_09_20260217_112133.json',
      'math_10_20260217_112222.json'
    ];

    let imported = 0;
    let skipped = 0;

    for (const filename of testFiles) {
      const filePath = path.join(questionsDir, filename);
      
      if (!fs.existsSync(filePath)) {
        console.log(`  ⚠️  File not found: ${filename}`);
        skipped++;
        continue;
      }

      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      // Convert choices array to JSON string
      const choices = data.choices || [];
      
      // Create question in database
      await prisma.question.create({
        data: {
          moduleType: 'math',
          difficulty: 'medium',
          category: data.subtopic || 'algebra',
          subtopic: data.subtopic,
          visualType: data.visualType,
          difficultyScore: data.difficultyScore || 50,
          question: data.question,
          passage: null,
          options: JSON.stringify(choices),
          correctAnswer: choices.findIndex(c => c.startsWith(data.correctAnswer)),
          explanation: data.solution || data.explanation,
          wrongAnswerExplanations: null,
          imageUrl: null,
          imageData: data.imageData ? Buffer.from(data.imageData, 'base64') : null,
          imageMimeType: data.imageData ? 'image/png' : null,
          imageAlt: data.imageAlt,
          chartData: null,
          timeEstimate: 120,
          source: 'V3 Generator - Test Batch',
          tags: JSON.stringify(['v3-test', 'classifier-fix']),
          isActive: true,
          reviewStatus: null,
          reviewRating: null,
          diagramAccurate: null,
          reviewComments: null,
          reviewedBy: null,
          reviewedAt: null
        }
      });

      console.log(`  ✅ Imported: ${filename}`);
      console.log(`     Question: ${data.question.substring(0, 60)}...`);
      console.log(`     Visual Type: ${data.visualType || 'null'}`);
      console.log(`     Image Data: ${data.imageData ? 'YES' : 'NO'}\n`);
      
      imported++;
    }

    console.log(`\n✅ Import complete!`);
    console.log(`   Imported: ${imported}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${imported + skipped}\n`);

    // Show updated count
    const totalCount = await prisma.question.count();
    console.log(`📊 Total questions in database: ${totalCount}\n`);

  } catch (error) {
    console.error('❌ Error importing questions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importTestQuestions();
