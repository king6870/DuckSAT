import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const question = await prisma.question.findFirst({
    where: { imageData: { not: null } },
    select: {
      id: true,
      question: true,
      imageData: true,
      imageUrl: true,
      imageMimeType: true
    }
  });

  if (question) {
    console.log('✅ Question with imageData found:');
    console.log('ID:', question.id);
    console.log('Question:', question.question.substring(0, 50) + '...');
    console.log('Has imageData:', !!question.imageData);
    console.log('ImageData length:', question.imageData?.length || 0, 'bytes');
    console.log('Has imageUrl:', !!question.imageUrl);
    console.log('ImageUrl:', question.imageUrl || 'null');
    console.log('ImageMimeType:', question.imageMimeType || 'null');
  } else {
    console.log('❌ No questions with imageData found');
  }

  // Check if API returns it correctly
  const allQuestions = await prisma.question.findMany({
    take: 5,
    select: {
      id: true,
      imageData: true,
      imageUrl: true
    }
  });

  console.log('\n📊 First 5 questions:');
  allQuestions.forEach((q, i) => {
    console.log(`${i + 1}. ID: ${q.id.substring(0, 8)}... | imageData: ${!!q.imageData} | imageUrl: ${q.imageUrl || 'null'}`);
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
