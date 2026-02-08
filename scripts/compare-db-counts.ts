import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const SOURCE_DATABASE_URL = process.env.SOURCE_DATABASE_URL;
const TARGET_DATABASE_URL = process.env.TARGET_DATABASE_URL;

if (!SOURCE_DATABASE_URL || !TARGET_DATABASE_URL) {
  throw new Error('SOURCE_DATABASE_URL and TARGET_DATABASE_URL are required');
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: TARGET_DATABASE_URL,
    },
  },
});

const pool = new Pool({
  connectionString: SOURCE_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const tables = [
  'users',
  'accounts',
  'sessions',
  'verificationtokens',
  'topics',
  'subtopics',
  'questions',
  'archived_questions',
  'test_results',
  'question_results',
  'question_reviews',
  'user_analytics',
  'category_performance',
  'study_sessions',
  'error_logs',
  'usage_analytics',
] as const;

type TableName = (typeof tables)[number];

async function getTargetCount(table: TableName) {
  switch (table) {
    case 'users':
      return prisma.user.count();
    case 'accounts':
      return prisma.account.count();
    case 'sessions':
      return prisma.session.count();
    case 'verificationtokens':
      return prisma.verificationToken.count();
    case 'topics':
      return prisma.topic.count();
    case 'subtopics':
      return prisma.subtopic.count();
    case 'questions':
      return prisma.question.count();
    case 'archived_questions':
      return prisma.archivedQuestion.count();
    case 'test_results':
      return prisma.testResult.count();
    case 'question_results':
      return prisma.questionResult.count();
    case 'question_reviews':
      return prisma.questionReview.count();
    case 'user_analytics':
      return prisma.userAnalytics.count();
    case 'category_performance':
      return prisma.categoryPerformance.count();
    case 'study_sessions':
      return prisma.studySession.count();
    case 'error_logs':
      return prisma.errorLog.count();
    case 'usage_analytics':
      return prisma.usageAnalytics.count();
    default:
      return 0;
  }
}

async function run() {
  for (const table of tables) {
    const src = await pool.query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM "${table}"`);
    const target = await getTargetCount(table);
    console.log(`${table}: source=${src.rows[0].count} target=${target}`);
  }
}

run()
  .catch((error) => {
    console.error('Count comparison failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
    await prisma.$disconnect();
  });
