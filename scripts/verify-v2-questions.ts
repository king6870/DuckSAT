#!/usr/bin/env node
/**
 * Verify V2 Questions in Azure SQL Database
 */

import { PrismaClient } from '@prisma/client';

const AZURE_SQL_CONNECTION = 'sqlserver://db-ducksat.database.windows.net:1433;database=DuckSAT_DB;user=lionvihaan;password=Microsoft757;encrypt=true;trustServerCertificate=false;loginTimeout=60';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: AZURE_SQL_CONNECTION
    }
  }
});

async function verify() {
  try {
    console.log('\n🔍 Verifying imported questions in Azure SQL...\n');

    // Count V2 questions
    const v2Questions = await prisma.question.findMany({
      where: {
        source: {
          contains: 'V2'
        }
      },
      select: {
        id: true,
        moduleType: true,
        category: true,
        imageData: true,
        passage: true
      }
    });

    const mathQuestions = v2Questions.filter(q => q.moduleType === 'math');
    const readingQuestions = v2Questions.filter(q => q.moduleType === 'reading-writing');
    const questionsWithDiagrams = mathQuestions.filter(q => q.imageData !== null);
    const questionsWithPassages = readingQuestions.filter(q => q.passage !== null);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ VERIFICATION RESULTS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total V2 Questions:        ${v2Questions.length}`);
    console.log(`Math Questions:            ${mathQuestions.length}`);
    console.log(`Reading Questions:         ${readingQuestions.length}`);
    console.log(`Math with Diagrams:        ${questionsWithDiagrams.length}`);
    console.log(`Reading with Passages:     ${questionsWithPassages.length}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Sample one question
    if (v2Questions.length > 0) {
      const sample = v2Questions[0];
      console.log('📋 Sample Question:');
      console.log(`   ID: ${sample.id}`);
      console.log(`   Module: ${sample.moduleType}`);
      console.log(`   Category: ${sample.category}`);
      console.log(`   Has Diagram: ${sample.imageData ? 'Yes' : 'No'}`);
      console.log(`   Has Passage: ${sample.passage ? 'Yes' : 'No'}\n`);
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
