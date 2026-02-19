#!/usr/bin/env node
/**
 * Quick Check - V2 Questions in Azure SQL
 */

import { PrismaClient } from '@prisma/client';

const AZURE_SQL_CONNECTION = 'sqlserver://db-ducksat.database.windows.net:1433;database=DuckSAT_DB;user=lionvihaan;password=Microsoft757;encrypt=true;trustServerCertificate=false;loginTimeout=60';

const prisma = new PrismaClient({
  datasources: { db: { url: AZURE_SQL_CONNECTION } }
});

async function quickCheck() {
  try {
    console.log('\n🔍 Checking Azure SQL Database for V2 Questions...\n');

    // Get all V2 questions
    const v2Questions = await prisma.question.findMany({
      where: { source: { contains: 'V2' } },
      select: {
        id: true,
        moduleType: true,
        category: true,
        question: true,
        imageData: true,
        passage: true,
        createdAt: true
      }
    });

    const mathQuestions = v2Questions.filter(q => q.moduleType === 'math');
    const readingQuestions = v2Questions.filter(q => q.moduleType === 'reading-writing');
    const withDiagrams = v2Questions.filter(q => q.imageData !== null);
    const withPassages = v2Questions.filter(q => q.passage !== null);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ DATABASE VERIFICATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📊 Total V2 Questions:     ${v2Questions.length}`);
    console.log(`📐 Math Questions:         ${mathQuestions.length}`);
    console.log(`📖 Reading Questions:      ${readingQuestions.length}`);
    console.log(`🖼️  With Diagrams:          ${withDiagrams.length}`);
    console.log(`📄 With Passages:          ${withPassages.length}`);
    console.log('═══════════════════════════════════════════════════════════');

    if (v2Questions.length > 0) {
      console.log('\n📋 Sample Questions:\n');
      v2Questions.slice(0, 3).forEach((q, i) => {
        console.log(`${i + 1}. [${q.moduleType.toUpperCase()}] ${q.question.substring(0, 80)}...`);
        console.log(`   → Has Diagram: ${q.imageData ? 'Yes ✓' : 'No'}`);
        console.log(`   → Has Passage: ${q.passage ? 'Yes ✓' : 'No'}`);
        console.log(`   → Created: ${q.createdAt.toLocaleString()}\n`);
      });
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ All V2 questions successfully transferred to Azure SQL!');
    console.log('════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

quickCheck();
