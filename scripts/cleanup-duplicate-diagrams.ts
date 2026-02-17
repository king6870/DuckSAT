import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDuplicates() {
  console.log('🧹 Cleaning up 5 corrupted V3 questions with duplicate diagrams...\n');

  // IDs of the 5 questions with duplicate imageData
  const duplicateIDs = [
    'cmlqx68e20000iuf404l1h010',  // math_01_20260217_100554
    'cmlqx68g80001iuf4fsmissc8',  // math_02_20260217_100632
    'cmlqx68hp0002iuf4k3grzm3g',  // math_03_20260217_100715
    'cmlqx68j30003iuf4e5liupc1',  // math_04_20260217_100753
    'cmlqx68k50004iuf4q1w3qklx'   // math_05_20260217_100815
  ];

  try {
    const result = await prisma.question.deleteMany({
      where: {
        id: {
          in: duplicateIDs
        }
      }
    });

    console.log(`✅ Deleted ${result.count} questions with duplicate diagrams`);
    console.log('📊 Expected: 5 questions deleted\n');

    // Verify deletion
    const remaining = await prisma.question.count({
      where: {
        imageData: { not: null }
      }
    });

    console.log(`📊 Questions with imageData remaining: ${remaining}`);
    console.log(`📊 Expected: 24 questions (29 - 5 deleted)\n`);

    if (remaining === 24) {
      console.log('✅ Cleanup successful! Ready to import new questions.');
    } else {
      console.log(`⚠️ Expected 24 questions with imageData, but found ${remaining}`);
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicates();
