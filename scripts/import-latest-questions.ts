/**
 * Import the latest batch of 10 generated questions with diagrams
 * Run with: npx tsx scripts/import-latest-questions.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function importLatestQuestions() {
  try {
    console.log('\n📥 Importing latest 10 questions with diagrams...\n');

    // Latest batch of questions from 12:28 timeframe
    const questionFiles = [
      'math_01_20260217_122357.json',
      'math_02_20260217_121350.json',
      'math_03_20260217_121427.json',
      'math_04_20260217_121646.json',
      'math_05_20260217_121833.json',
      'math_06_20260217_122108.json',
      'math_07_20260217_122149.json',
      'math_08_20260217_122357.json',
      'math_09_20260217_122545.json',
      'math_10_20260217_122815.json'
    ];

    const baseDir = path.join(__dirname, '../../azuredev-038d-main/generated_questions_v3/');
    let imported = 0;
    let withDiagrams = 0;

    for (const filename of questionFiles) {
      const filePath = path.join(baseDir, filename);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filename}`);
        continue;
      }

      const rawData = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(rawData);

      // Parse choices array
      const choices = data.choices || [];

      // Convert correctAnswer letter to index
      const correctAnswerIndex = choices.findIndex((c: string) => 
        c.startsWith(data.correctAnswer + ')')
      );

      // Convert imageData to Buffer if exists
      const imageData = data.imageData ? Buffer.from(data.imageData, 'base64') : null;
      
      const hasDiagram = imageData !== null;
      if (hasDiagram) withDiagrams++;

      await prisma.question.create({
        data: {
          moduleType: 'math',
          question: data.question,
          options: JSON.stringify(choices),
          correctAnswer: correctAnswerIndex >= 0 ? correctAnswerIndex : 0,
          explanation: data.solution || data.explanation,
          visualType: data.visualType || 'none',
          imageData: imageData,
          imageMimeType: imageData ? 'image/png' : null,
          category: data.subtopic || 'general',
          difficulty: 'medium',
          difficultyScore: data.difficultyScore || 50,
          timeEstimate: 90,
          tags: JSON.stringify(['v3-latest', 'feb17-batch', hasDiagram ? 'with-diagram' : 'no-diagram']),
          isActive: true,
          reviewStatus: 'pending'
        }
      });

      imported++;
      console.log(`  ✅ Imported ${filename} ${hasDiagram ? '🖼️  (with diagram)' : ''}`);
    }

    // Get updated database stats
    const totalQuestions = await prisma.question.count();
    const questionsWithDiagrams = await prisma.question.count({
      where: {
        imageData: { not: null }
      }
    });

    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log(`✅ Import complete!`);
    console.log(`   📊 Imported: ${imported} questions`);
    console.log(`   🖼️  With diagrams: ${withDiagrams}`);
    console.log(`\n📈 Database totals:`);
    console.log(`   Total questions: ${totalQuestions}`);
    console.log(`   Questions with diagrams: ${questionsWithDiagrams}`);
    console.log('═══════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error importing questions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importLatestQuestions();
