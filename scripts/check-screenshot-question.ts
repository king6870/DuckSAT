import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkScreenshotQuestion() {
  // The question ID from the screenshot
  const q = await prisma.question.findUnique({
    where: { id: 'cmlqrhqu0000aiuwwukrlzdk5' },
    select: { 
      id: true,
      question: true,
      explanation: true
    }
  });
  
  console.log('\n=== QUESTION FROM SCREENSHOT ===\n');
  console.log('ID:', q?.id);
  console.log('\nQuestion:', q?.question.slice(0, 200));
  console.log('\nExplanation (first 400 chars):');
  console.log(q?.explanation.slice(0, 400));
  console.log('\n... middle part ...');
  console.log('\nExplanation (chars 400-800):');
  console.log(q?.explanation.slice(400, 800));
  
  // Count dollar signs
  const dollarCount = (q?.explanation.match(/\$/g) || []).length;
  console.log('\n\nDollar sign count in explanation:', dollarCount);
  
  // Check for LaTeX commands
  const hasLatex = /\\(frac|left|right|sqrt)/i.test(q?.explanation || '');
  console.log('Contains LaTeX commands:', hasLatex);
  
  await prisma.$disconnect();
}

checkScreenshotQuestion();
