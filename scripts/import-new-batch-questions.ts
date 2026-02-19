import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { normalizeLatex, normalizeLatexInOptions } from './lib/normalize-latex';

const prisma = new PrismaClient();

async function importNewBatchQuestions() {
  try {
    console.log('\n📥 Importing new batch of questions...\n');

    const v3Dir = path.join('..', 'azuredev-038d-main', 'generated_questions_v3');
    const v2Dir = path.join('..', 'azuredev-038d-main', 'generated_questions_v2');

    // Get existing question count
    const existingCount = await prisma.question.count();
    console.log(`📊 Current database: ${existingCount} questions\n`);

    // Get files to import
    const v3Files = fs.readdirSync(v3Dir)
      .filter(f => f.match(/^(math|reading)_\d+_20260217_[12]\d{4}\.json$/) || f.match(/^(math)_\d+_20260218_\d{6}\.json$/))
      .filter(f => !f.includes('SUMMARY'))
      .map(f => ({ path: path.join(v3Dir, f), name: f }));

    const v2Files = fs.readdirSync(v2Dir)
      .filter(f => f.match(/^reading_p\d+_q\d+_202602(17|18)_\d{6}\.json$/))
      .filter(f => !f.includes('SUMMARY'))
      .map(f => ({ path: path.join(v2Dir, f), name: f }));

    console.log(`📐 Math questions (v3): ${v3Files.length} files`);
    console.log(`📖 Reading questions (v2): ${v2Files.length} files\n`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const allFiles = [...v3Files, ...v2Files];

    for (const file of allFiles) {
      try {
        const content = JSON.parse(fs.readFileSync(file.path, 'utf-8'));

        // Skip duplicate check due to TEXT datatype limitations in SQL Server
        // We'll import all and let database handle constraints

        // Prepare image data if present
        let imageBuffer = null;
        if (content.imageData) {
          // Check if it's already base64 or needs conversion
          const base64Data = content.imageData.startsWith('data:image')
            ? content.imageData.split(',')[1]
            : content.imageData;
          imageBuffer = Buffer.from(base64Data, 'base64');
        }

        // Convert correctAnswer to number if it's a letter
        let correctAnswerIndex: number;
        const answer = content.correctAnswer ?? content.correct_answer;
        if (typeof answer === 'string') {
          const letterToIndex: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
          correctAnswerIndex = letterToIndex[answer.toUpperCase()] ?? 0;
        } else {
          correctAnswerIndex = answer ?? 0;
        }

        // Normalize LaTeX before import
        const normalizedQuestion = normalizeLatex(content.question);
        const normalizedExplanation = normalizeLatex(content.explanation || 'No explanation provided.');
        const normalizedOptions = normalizeLatexInOptions(JSON.stringify(content.choices || content.options));

        // Import question
        await prisma.question.create({
          data: {
            question: normalizedQuestion,
            options: normalizedOptions,
            correctAnswer: correctAnswerIndex,
            explanation: normalizedExplanation,
            imageData: imageBuffer,
            imageAlt: content.imageAlt || content.visualType || null,
            imageMimeType: content.imageMimeType || (imageBuffer ? 'image/png' : null),
            visualType: content.visualType || 'none',
            category: content.category || (file.name.startsWith('math') ? 'math' : 'reading'),
            subtopic: content.subtopic || null,
            difficulty: content.difficulty || 'medium',
            difficultyScore: content.difficultyScore || 50,
            moduleType: content.moduleType || (file.name.startsWith('math') ? 'math' : 'verbal'),
            source: 'v3-batch-feb17-18',
            timeEstimate: 90,
            isActive: true,
            reviewStatus: 'pending',
            diagramAccurate: null,
            tags: JSON.stringify(['v3-batch-feb17-18', imageBuffer ? 'with-diagram' : 'no-diagram'])
          }
        });

        imported++;

        if (imported % 10 === 0) {
          console.log(`   ✓ Imported ${imported}/${allFiles.length}...`);
        }
      } catch (err: any) {
        errors++;
        console.error(`   ❌ Error importing ${file.name}: ${err.message}`);
      }
    }

    const finalCount = await prisma.question.count();
    const withDiagrams = await prisma.question.count({
      where: { imageData: { not: null } }
    });

    console.log(`\n✅ Import complete!`);
    console.log(`   📥 Imported: ${imported}`);
    console.log(`   ⏭️  Skipped (duplicates): ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`\n📊 Database totals:`);
    console.log(`   Total questions: ${existingCount} → ${finalCount} (+${finalCount - existingCount})`);
    console.log(`   With diagrams: ${withDiagrams}`);

  } catch (error: any) {
    console.error('\n❌ Error during import:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importNewBatchQuestions();
