import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkImageData() {
  console.log('🔍 Checking for image data in database...\n');
  
  const geometryQuestions = await prisma.question.findMany({
    where: { category: 'geometry' },
    select: {
      id: true,
      question: true,
      imageData: true,
      imageUrl: true
    },
    take: 5
  });

  console.log(`Found ${geometryQuestions.length} geometry questions\n`);
  
  geometryQuestions.forEach((q, index) => {
    console.log(`Question ${index + 1} (ID: ${q.id}):`);
    console.log(`  Has imageData: ${!!q.imageData}`);
    console.log(`  Has imageUrl: ${!!q.imageUrl}`);
    console.log(`  Question preview: ${q.question.substring(0, 80)}...`);
    console.log('');
  });

  // Count all questions with images
  const withImageData = await prisma.question.count({
    where: { imageData: { not: null } }
  });

  const withImageUrl = await prisma.question.count({
    where: { imageUrl: { not: null } }
  });

  console.log('\n📊 Image Data Summary:');
  console.log(`  Questions with imageData: ${withImageData}`);
  console.log(`  Questions with imageUrl: ${withImageUrl}`);

  await prisma.$disconnect();
}

checkImageData().catch(console.error);
