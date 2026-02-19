import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    const count = await prisma.question.count();
    console.log('📊 Total questions in database:', count);
    
    const recent = await prisma.question.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        question: true,
        visualType: true,
        imageData: true,
        createdAt: true
      }
    });
    
    console.log('\n🕐 5 Most Recent Questions:');
    recent.forEach((q, i) => {
      console.log(`${i+1}. [${q.visualType || 'null'}] ${q.question.substring(0, 60)}...`);
      console.log(`   Image: ${q.imageData ? 'YES' : 'NO'} | Created: ${q.createdAt.toISOString()}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
