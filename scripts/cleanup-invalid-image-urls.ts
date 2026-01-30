import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning up invalid imageUrl references...');

  // Find questions with imageUrl but no actual files
  const questionsWithImageUrl = await prisma.question.findMany({
    where: {
      imageUrl: { not: null }
    },
    select: {
      id: true,
      imageUrl: true,
      imageData: true
    }
  });

  console.log(`Found ${questionsWithImageUrl.length} questions with imageUrl`);

  // Clear imageUrl for questions that don't have actual files or imageData
  for (const q of questionsWithImageUrl) {
    // If the imageUrl is a local path (starts with /images/) and there's no imageData, clear it
    if (q.imageUrl && q.imageUrl.startsWith('/images/') && !q.imageData) {
      await prisma.question.update({
        where: { id: q.id },
        data: { imageUrl: null }
      });
      console.log(`✅ Cleared imageUrl for question ${q.id.substring(0, 8)}...`);
    }
  }

  console.log('🎉 Cleanup complete!');
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error('❌ Error:', e);
    prisma.$disconnect();
    process.exit(1);
  });
