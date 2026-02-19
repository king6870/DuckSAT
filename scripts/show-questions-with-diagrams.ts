import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showQuestionsWithDiagrams() {
  try {
    console.log('\n🔍 Querying all working questions with diagrams...\n');

    const questions = await prisma.question.findMany({
      where: {
        isActive: true,
        imageData: {
          not: null
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        question: true,
        options: true,
        correctAnswer: true,
        explanation: true,
        visualType: true,
        imageData: true,
        imageAlt: true,
        imageMimeType: true,
        category: true,
        subtopic: true,
        difficulty: true,
        difficultyScore: true,
        moduleType: true,
        source: true,
        reviewStatus: true,
        diagramAccurate: true,
        createdAt: true
      }
    });

    console.log(`✅ Found ${questions.length} questions with diagrams\n`);
    console.log('═══════════════════════════════════════════════════════════════════\n');

    questions.forEach((q, index) => {
      const choices = JSON.parse(q.options);
      const correctChoice = choices[q.correctAnswer];
      
      console.log(`Question ${index + 1}:`);
      console.log(`  ID: ${q.id}`);
      console.log(`  Question: ${q.question.substring(0, 100)}...`);
      console.log(`\n  📊 Choices:`);
      choices.forEach((choice: string, i: number) => {
        const marker = i === q.correctAnswer ? '✅' : '  ';
        console.log(`    ${marker} ${choice}`);
      });
      console.log(`\n  ✅ Correct Answer: ${correctChoice}`);
      console.log(`  💡 Explanation: ${q.explanation.substring(0, 100)}...`);
      
      console.log(`\n  🖼️  Diagram Info:`);
      console.log(`     Visual Type: ${q.visualType || 'not specified'}`);
      console.log(`     Image Size: ${q.imageData ? (q.imageData.length / 1024).toFixed(2) + ' KB' : 'N/A'}`);
      console.log(`     Image Type: ${q.imageMimeType || 'not specified'}`);
      console.log(`     Alt Text: ${q.imageAlt || 'none'}`);
      console.log(`     Diagram Accurate: ${q.diagramAccurate === null ? 'Not reviewed' : (q.diagramAccurate ? 'YES ✅' : 'NO ❌')}`);
      
      console.log(`\n  📚 Metadata:`);
      console.log(`     Module: ${q.moduleType}`);
      console.log(`     Category: ${q.category}`);
      console.log(`     Subtopic: ${q.subtopic || 'none'}`);
      console.log(`     Difficulty: ${q.difficulty} (Score: ${q.difficultyScore || 'N/A'})`);
      console.log(`     Source: ${q.source || 'Unknown'}`);
      console.log(`     Review Status: ${q.reviewStatus || 'Not reviewed'}`);
      console.log(`     Created: ${q.createdAt.toISOString()}`);
      
      console.log('───────────────────────────────────────────────────────────────────\n');
    });

    // Summary statistics
    const byVisualType = questions.reduce((acc, q) => {
      const type = q.visualType || 'unspecified';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byCategory = questions.reduce((acc, q) => {
      acc[q.category] = (acc[q.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byDifficulty = questions.reduce((acc, q) => {
      acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const accuracyReviewed = questions.filter(q => q.diagramAccurate !== null).length;
    const accuracyApproved = questions.filter(q => q.diagramAccurate === true).length;

    console.log('\n📊 Summary Statistics:');
    console.log(`  Total questions with diagrams: ${questions.length}`);
    console.log(`  Diagram accuracy reviewed: ${accuracyReviewed}`);
    console.log(`  Diagram accuracy approved: ${accuracyApproved}`);
    
    console.log(`\n  By Visual Type:`);
    Object.entries(byVisualType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`    ${type}: ${count}`);
      });
    
    console.log(`\n  By Category:`);
    Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        console.log(`    ${category}: ${count}`);
      });
    
    console.log(`\n  By Difficulty:`);
    Object.entries(byDifficulty)
      .sort((a, b) => b[1] - a[1])
      .forEach(([difficulty, count]) => {
        console.log(`    ${difficulty}: ${count}`);
      });

    // Total image data size
    const totalImageSize = questions.reduce((sum, q) => 
      sum + (q.imageData ? q.imageData.length : 0), 0
    );
    console.log(`\n  Total diagram storage: ${(totalImageSize / 1024 / 1024).toFixed(2)} MB`);

  } catch (error) {
    console.error('❌ Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

showQuestionsWithDiagrams();
