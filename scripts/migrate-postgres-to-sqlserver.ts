import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

type JsonValue = unknown;

const SOURCE_DATABASE_URL = process.env.SOURCE_DATABASE_URL;
const TARGET_DATABASE_URL = process.env.TARGET_DATABASE_URL;

if (!SOURCE_DATABASE_URL) {
  throw new Error('SOURCE_DATABASE_URL is required');
}

if (!TARGET_DATABASE_URL) {
  throw new Error('TARGET_DATABASE_URL is required');
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

const BATCH_SIZE = 500;

function toJsonText(value: JsonValue): string | null {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

function toJsonTextOrEmptyArray(value: JsonValue): string {
  if (value === null || value === undefined) return JSON.stringify([]);
  return JSON.stringify(value);
}

async function fetchAll(tableName: string) {
  const query = `SELECT * FROM "${tableName}"`;
  const result = await pool.query(query);
  return result.rows;
}

async function createManyInBatches<T>(
  modelName: string,
  rows: T[],
  createMany: (data: T[]) => Promise<{ count: number }>
) {
  let total = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { count } = await createMany(batch);
    total += count;
    console.log(`[${modelName}] inserted ${total}/${rows.length}`);
  }
}

async function migrate() {
  console.log('Starting migration...');

  const users = await fetchAll('users');
  await createManyInBatches('users', users, (data) => prisma.user.createMany({ data }));

  const accounts = await fetchAll('accounts');
  await createManyInBatches('accounts', accounts, (data) => prisma.account.createMany({ data }));

  const sessions = await fetchAll('sessions');
  await createManyInBatches('sessions', sessions, (data) => prisma.session.createMany({ data }));

  const verificationTokens = await fetchAll('verificationtokens');
  await createManyInBatches('verificationtokens', verificationTokens, (data) => prisma.verificationToken.createMany({ data }));

  const topics = await fetchAll('topics');
  await createManyInBatches('topics', topics, (data) => prisma.topic.createMany({ data }));

  const subtopics = await fetchAll('subtopics');
  await createManyInBatches('subtopics', subtopics, (data) => prisma.subtopic.createMany({ data }));

  const questionsRaw = await fetchAll('questions');
  const questions = questionsRaw.map((row) => ({
    ...row,
    options: toJsonTextOrEmptyArray(row.options),
    wrongAnswerExplanations: toJsonText(row.wrongAnswerExplanations),
    chartData: toJsonText(row.chartData),
    tags: toJsonTextOrEmptyArray(row.tags),
  }));
  await createManyInBatches('questions', questions, (data) => prisma.question.createMany({ data }));

  const archivedQuestionsRaw = await fetchAll('archived_questions');
  const archivedQuestions = archivedQuestionsRaw.map((row) => ({
    ...row,
    options: toJsonTextOrEmptyArray(row.options),
    wrongAnswerExplanations: toJsonText(row.wrongAnswerExplanations),
    chartData: toJsonText(row.chartData),
    tags: toJsonTextOrEmptyArray(row.tags),
  }));
  await createManyInBatches('archived_questions', archivedQuestions, (data) => prisma.archivedQuestion.createMany({ data }));

  const testResultsRaw = await fetchAll('test_results');
  const testResults = testResultsRaw.map((row) => ({
    ...row,
    categoryPerformance: toJsonTextOrEmptyArray(row.categoryPerformance),
    subtopicPerformance: toJsonText(row.subtopicPerformance),
    difficultyPerformance: toJsonText(row.difficultyPerformance),
  }));
  await createManyInBatches('test_results', testResults, (data) => prisma.testResult.createMany({ data }));

  const questionResults = await fetchAll('question_results');
  await createManyInBatches('question_results', questionResults, (data) => prisma.questionResult.createMany({ data }));

  const questionReviews = await fetchAll('question_reviews');
  await createManyInBatches('question_reviews', questionReviews, (data) => prisma.questionReview.createMany({ data }));

  const userAnalytics = await fetchAll('user_analytics');
  await createManyInBatches('user_analytics', userAnalytics, (data) => prisma.userAnalytics.createMany({ data }));

  const categoryPerformance = await fetchAll('category_performance');
  await createManyInBatches('category_performance', categoryPerformance, (data) => prisma.categoryPerformance.createMany({ data }));

  const studySessionsRaw = await fetchAll('study_sessions');
  const studySessions = studySessionsRaw.map((row) => ({
    ...row,
    categories: toJsonText(row.categories),
    subtopics: toJsonText(row.subtopics),
  }));
  await createManyInBatches('study_sessions', studySessions, (data) => prisma.studySession.createMany({ data }));

  const errorLogsRaw = await fetchAll('error_logs');
  const errorLogs = errorLogsRaw.map((row) => ({
    ...row,
    metadata: toJsonText(row.metadata),
  }));
  await createManyInBatches('error_logs', errorLogs, (data) => prisma.errorLog.createMany({ data }));

  const usageAnalyticsRaw = await fetchAll('usage_analytics');
  const usageAnalytics = usageAnalyticsRaw.map((row) => ({
    ...row,
    metadata: toJsonText(row.metadata),
  }));
  await createManyInBatches('usage_analytics', usageAnalytics, (data) => prisma.usageAnalytics.createMany({ data }));

  console.log('Migration complete.');
}

migrate()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
    await prisma.$disconnect();
  });
