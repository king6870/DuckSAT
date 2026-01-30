import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeDiagramAccuracy() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║           Detailed Diagram & Question Accuracy Check          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Get questions with diagrams
  const questionsWithDiagrams = await prisma.question.findMany({
    where: { imageData: { not: null } },
    take: 10,
    select: {
      id: true,
      question: true,
      options: true,
      correctAnswer: true,
      explanation: true,
      category: true,
      imageData: true,
      imageMimeType: true,
      chartData: true
    }
  });

  console.log(`Found ${questionsWithDiagrams.length} questions with diagrams\n`);
  console.log('─'.repeat(80));

  for (const [idx, q] of questionsWithDiagrams.entries()) {
    console.log(`\n[Question ${idx + 1}] Category: ${q.category}`);
    console.log(`ID: ${q.id}`);
    console.log(`\nQuestion Text:`);
    console.log(q.question);
    
    console.log(`\nOptions:`);
    q.options.forEach((opt, i) => {
      const marker = i === q.correctAnswer ? '✓' : ' ';
      console.log(`  [${marker}] ${i}. ${opt}`);
    });

    console.log(`\nCorrect Answer: ${q.correctAnswer} - ${q.options[q.correctAnswer]}`);
    
    console.log(`\nExplanation:`);
    console.log(q.explanation);

    if (q.imageData) {
      const imageSize = Buffer.from(q.imageData).length;
      console.log(`\n📊 Diagram Details:`);
      console.log(`  Format: ${q.imageMimeType}`);
      console.log(`  Size: ${(imageSize / 1024).toFixed(2)} KB`);
      
      if (q.imageMimeType === 'image/svg+xml') {
        const svgContent = Buffer.from(q.imageData).toString('utf-8');
        console.log(`\n  SVG Preview (first 500 chars):`);
        console.log(`  ${svgContent.substring(0, 500)}...`);
        
        // Check for common SVG elements
        const hasRect = svgContent.includes('<rect');
        const hasCircle = svgContent.includes('<circle');
        const hasPath = svgContent.includes('<path');
        const hasText = svgContent.includes('<text');
        const hasLine = svgContent.includes('<line');
        const hasPolygon = svgContent.includes('<polygon');
        
        console.log(`\n  SVG Elements:`);
        if (hasRect) console.log(`    ✓ Rectangles`);
        if (hasCircle) console.log(`    ✓ Circles`);
        if (hasPath) console.log(`    ✓ Paths`);
        if (hasText) console.log(`    ✓ Text labels`);
        if (hasLine) console.log(`    ✓ Lines`);
        if (hasPolygon) console.log(`    ✓ Polygons`);
      }

      if (q.chartData) {
        console.log(`\n  Chart Data: ${JSON.stringify(q.chartData).substring(0, 200)}`);
      }
    }

    // Accuracy Assessment
    console.log(`\n🎯 Accuracy Assessment:`);
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check if question mentions diagram
    const mentionsDiagram = /diagram|figure|graph|chart|shown|above|below|illustration/i.test(q.question);
    if (q.imageData && !mentionsDiagram) {
      warnings.push('Question has diagram but doesn\'t reference it');
    }

    // Check if it's a placeholder question
    if (q.question.includes('Math question') && q.question.includes('Solve for the value')) {
      issues.push('PLACEHOLDER QUESTION - Not real SAT content');
    }

    // Check explanation quality
    if (!q.explanation || q.explanation.length < 50) {
      warnings.push('Explanation too short or missing');
    }

    // Check options format
    const hasVariedOptions = new Set(q.options).size === q.options.length;
    if (!hasVariedOptions) {
      issues.push('Duplicate options detected');
    }

    if (issues.length > 0) {
      console.log(`  ❌ ISSUES:`);
      issues.forEach(issue => console.log(`     - ${issue}`));
    }
    
    if (warnings.length > 0) {
      console.log(`  ⚠️  WARNINGS:`);
      warnings.forEach(warn => console.log(`     - ${warn}`));
    }

    if (issues.length === 0 && warnings.length === 0) {
      console.log(`  ✅ Quality looks good`);
    }

    console.log('\n' + '─'.repeat(80));
  }

  // Overall Assessment
  console.log(`\n\n📊 OVERALL ASSESSMENT:\n`);
  
  const totalWithDiagrams = await prisma.question.count({ where: { imageData: { not: null } } });
  const mathWithDiagrams = await prisma.question.count({ 
    where: { 
      imageData: { not: null },
      moduleType: 'math'
    } 
  });

  console.log(`Total questions with diagrams: ${totalWithDiagrams}`);
  console.log(`Math questions with diagrams: ${mathWithDiagrams}`);
  console.log(`Reading questions with diagrams: ${totalWithDiagrams - mathWithDiagrams}`);

  // Check for placeholder content
  const placeholderQuestions = await prisma.question.count({
    where: {
      question: {
        contains: 'Math question'
      }
    }
  });

  if (placeholderQuestions > 0) {
    console.log(`\n⚠️  WARNING: ${placeholderQuestions} placeholder questions detected!`);
    console.log(`   These are NOT real SAT questions and need to be regenerated with Azure OpenAI.`);
  }

  console.log('\n✅ Analysis complete!\n');

  await prisma.$disconnect();
}

analyzeDiagramAccuracy().catch(console.error);
