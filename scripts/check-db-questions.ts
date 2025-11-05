import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Checking database connection...');
    
    // Count questions
    const questionCount = await prisma.question.count();
    console.log(`✅ Database connected. Found ${questionCount} questions.`);
    
    if (questionCount > 0) {
      // Get a sample question
      const sampleQuestion = await prisma.question.findFirst({
        include: {
          subtopicRef: {
            include: {
              topic: true
            }
          }
        }
      });
      
      console.log('\n📝 Sample question:');
      console.log(JSON.stringify(sampleQuestion, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
