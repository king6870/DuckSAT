import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function testQuery() {
  try {
    console.log('Testing the query that the API uses...\n');
    
    const where: Prisma.QuestionWhereInput = {
      isActive: true
    };
    
    const sortOrder: 'asc' | 'desc' = 'desc';
    const limit = 20;
    const offset = 0;
    
    console.log('Fetching questions with the same query as the API...');
    
    const questions = await prisma.question.findMany({
      where,
      include: {
        subtopicRef: {
          include: {
            topic: true
          }
        },
        _count: {
          select: {
            questionResults: true
          }
        }
      },
      orderBy: {
        createdAt: sortOrder
      },
      take: limit,
      skip: offset
    });
    
    console.log(`✅ Query successful! Found ${questions.length} questions`);
    
    if (questions.length > 0) {
      console.log('\nFirst question details:');
      console.log('ID:', questions[0].id);
      console.log('Question:', questions[0].question.substring(0, 100) + '...');
      console.log('Category:', questions[0].category);
      console.log('Subtopic:', questions[0].subtopic);
      console.log('SubtopicRef:', questions[0].subtopicRef?.name || 'null');
      console.log('_count:', questions[0]._count);
    }
    
  } catch (error) {
    console.error('❌ Query failed with error:');
    console.error(error);
    
    if (error instanceof Error) {
      console.error('\nError message:', error.message);
      console.error('Error stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testQuery();
