import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeQuestions() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         Question Database Analysis & Quality Check            ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Get total counts
  const totalQuestions = await prisma.question.count();
  const mathQuestions = await prisma.question.count({ where: { moduleType: 'math' } });
  const readingQuestions = await prisma.question.count({ where: { moduleType: 'reading-writing' } });
  const questionsWithDiagrams = await prisma.question.count({ where: { imageData: { not: null } } });

  console.log('📊 OVERVIEW:');
  console.log(`  Total Questions: ${totalQuestions}`);
  console.log(`  Math Questions: ${mathQuestions}`);
  console.log(`  Reading Questions: ${readingQuestions}`);
  console.log(`  Questions with Diagrams: ${questionsWithDiagrams}\n`);

  // Get sample questions for quality analysis
  console.log('🔍 QUALITY ANALYSIS - Sample Questions:\n');
  console.log('─'.repeat(80));

  // Math Questions
  const mathSamples = await prisma.question.findMany({
    where: { moduleType: 'math' },
    take: 3,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      question: true,
      options: true,
      correctAnswer: true,
      explanation: true,
      category: true,
      imageData: true,
      source: true
    }
  });

  console.log('\n📐 MATH QUESTIONS:\n');
  mathSamples.forEach((q, idx) => {
    console.log(`\n[Math ${idx + 1}] Category: ${q.category}`);
    console.log(`Question: ${q.question.substring(0, 100)}...`);
    console.log(`Options: ${q.options.length} choices`);
    console.log(`Correct Answer: ${q.correctAnswer} (${q.options[q.correctAnswer]})`);
    console.log(`Has Explanation: ${q.explanation ? '✓' : '✗'}`);
    console.log(`Has Diagram: ${q.imageData ? '✓' : '✗'}`);
    console.log(`Source: ${q.source || 'Unknown'}`);
    
    // Quality checks
    const issues: string[] = [];
    if (!q.explanation) issues.push('Missing explanation');
    if (q.options.length !== 4) issues.push(`Wrong option count: ${q.options.length}`);
    if (q.correctAnswer < 0 || q.correctAnswer >= q.options.length) issues.push('Invalid correct answer index');
    if (q.question.length < 20) issues.push('Question too short');
    
    if (issues.length > 0) {
      console.log(`⚠️  Issues: ${issues.join(', ')}`);
    } else {
      console.log(`✅ Quality: Good`);
    }
  });

  // Reading Questions
  const readingSamples = await prisma.question.findMany({
    where: { moduleType: 'reading-writing' },
    take: 3,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      question: true,
      passage: true,
      options: true,
      correctAnswer: true,
      explanation: true,
      category: true,
      imageData: true,
      source: true
    }
  });

  console.log('\n\n📚 READING QUESTIONS:\n');
  readingSamples.forEach((q, idx) => {
    console.log(`\n[Reading ${idx + 1}] Category: ${q.category}`);
    console.log(`Question: ${q.question.substring(0, 100)}...`);
    console.log(`Has Passage: ${q.passage ? '✓' : '✗'} (${q.passage ? q.passage.length : 0} chars)`);
    console.log(`Options: ${q.options.length} choices`);
    console.log(`Correct Answer: ${q.correctAnswer} (${q.options[q.correctAnswer]})`);
    console.log(`Has Explanation: ${q.explanation ? '✓' : '✗'}`);
    console.log(`Has Diagram: ${q.imageData ? '✓' : '✗'}`);
    console.log(`Source: ${q.source || 'Unknown'}`);
    
    // Quality checks
    const issues: string[] = [];
    if (!q.explanation) issues.push('Missing explanation');
    if (q.options.length !== 4) issues.push(`Wrong option count: ${q.options.length}`);
    if (q.correctAnswer < 0 || q.correctAnswer >= q.options.length) issues.push('Invalid correct answer index');
    if (q.question.length < 20) issues.push('Question too short');
    if (!q.passage) issues.push('Missing passage');
    
    if (issues.length > 0) {
      console.log(`⚠️  Issues: ${issues.join(', ')}`);
    } else {
      console.log(`✅ Quality: Good`);
    }
  });

  // Diagram Analysis
  console.log('\n\n🖼️  DIAGRAM ANALYSIS:\n');
  console.log('─'.repeat(80));

  const diagramQuestions = await prisma.question.findMany({
    where: { imageData: { not: null } },
    take: 5,
    select: {
      id: true,
      question: true,
      category: true,
      imageData: true,
      imageMimeType: true,
      chartData: true
    }
  });

  diagramQuestions.forEach((q, idx) => {
    const imageSize = q.imageData ? Buffer.from(q.imageData).length : 0;
    console.log(`\n[Diagram ${idx + 1}]`);
    console.log(`  Category: ${q.category}`);
    console.log(`  MIME Type: ${q.imageMimeType || 'Not specified'}`);
    console.log(`  Image Size: ${(imageSize / 1024).toFixed(2)} KB`);
    console.log(`  Has Chart Data: ${q.chartData ? '✓' : '✗'}`);
    
    if (q.imageData && q.imageMimeType === 'image/svg+xml') {
      const svgContent = Buffer.from(q.imageData).toString('utf-8');
      if (svgContent.includes('<svg')) {
        console.log(`  ✅ Valid SVG format`);
      } else {
        console.log(`  ⚠️  Invalid SVG format`);
      }
    }
  });

  // Category distribution
  console.log('\n\n📈 CATEGORY DISTRIBUTION:\n');
  console.log('─'.repeat(80));

  const categories = await prisma.question.groupBy({
    by: ['category'],
    _count: { id: true }
  });

  categories.forEach(cat => {
    const percentage = ((cat._count.id / totalQuestions) * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(cat._count.id / 2));
    console.log(`  ${cat.category.padEnd(25)} ${cat._count.id.toString().padStart(3)} (${percentage}%) ${bar}`);
  });

  // Source distribution
  console.log('\n\n🔖 SOURCE DISTRIBUTION:\n');
  console.log('─'.repeat(80));

  const sources = await prisma.question.groupBy({
    by: ['source'],
    _count: { id: true }
  });

  sources.forEach(src => {
    const percentage = ((src._count.id / totalQuestions) * 100).toFixed(1);
    console.log(`  ${(src.source || 'Unknown').padEnd(30)} ${src._count.id.toString().padStart(3)} (${percentage}%)`);
  });

  console.log('\n' + '─'.repeat(80));
  console.log('✅ Analysis complete!\n');

  await prisma.$disconnect();
}

analyzeQuestions().catch(console.error);
