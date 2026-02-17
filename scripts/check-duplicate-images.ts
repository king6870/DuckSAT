import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicateImages() {
  console.log('🔍 Checking for duplicate imageData in database...\n');

  // Fetch all questions with imageData
  const questionsWithImages = await prisma.question.findMany({
    where: {
      imageData: { not: null }
    },
    select: {
      id: true,
      question: true,
      imageData: true,
      category: true
    }
  });

  console.log(`Found ${questionsWithImages.length} questions with imageData\n`);

  if (questionsWithImages.length === 0) {
    console.log('❌ No questions with imageData found');
    return;
  }

  // Create map of imageData hashes
  const imageHashes = new Map<string, string[]>();

  for (const q of questionsWithImages) {
    if (!q.imageData) continue;

    // Create hash from first 100 bytes of image
    const hash = q.imageData.slice(0, 100).toString('hex');
    
    if (!imageHashes.has(hash)) {
      imageHashes.set(hash, []);
    }
    imageHashes.get(hash)!.push(q.id);
  }

  console.log(`📊 Unique image hashes: ${imageHashes.size}`);
  console.log(`📊 Total questions with images: ${questionsWithImages.length}\n`);

  if (imageHashes.size === 1) {
    console.log('❌ CRITICAL: All questions have the SAME imageData!');
    console.log('\nQuestions affected:');
    questionsWithImages.slice(0, 10).forEach((q, idx) => {
      console.log(`  ${idx + 1}. ${q.id}: ${q.question.substring(0, 80)}...`);
    });
    console.log(`  ... and ${questionsWithImages.length - 10} more\n`);
  } else {
    console.log('✅ Multiple unique images found');
    console.log('\nImage distribution:');
    let idx = 1;
    for (const [hash, questionIds] of imageHashes.entries()) {
      console.log(`  Image ${idx}: ${questionIds.length} questions`);
      console.log(`    Hash: ${hash.substring(0, 40)}...`);
      console.log(`    Question IDs: ${questionIds.slice(0, 3).join(', ')}${questionIds.length > 3 ? '...' : ''}`);
      idx++;
    }
  }

  await prisma.$disconnect();
}

checkDuplicateImages().catch(console.error);
