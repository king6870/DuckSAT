import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteCorruptedBatch() {
  try {
    console.log('\n🗑️  Deleting corrupted batch...\n');

    // Count before deletion
    const beforeCount = await prisma.question.count();
    const corruptedCount = await prisma.question.count({
      where: { source: 'v3-batch-feb17-18' }
    });

    console.log(`📊 Current database: ${beforeCount} questions`);
    console.log(`❌ Corrupted (v3-batch-feb17-18): ${corruptedCount} questions\n`);

    // Delete the corrupted batch
    const result = await prisma.question.deleteMany({
      where: { source: 'v3-batch-feb17-18' }
    });

    const afterCount = await prisma.question.count();

    console.log(`✅ Deleted ${result.count} corrupted questions`);
    console.log(`📊 Database now: ${afterCount} questions\n`);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteCorruptedBatch();
