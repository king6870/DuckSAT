#!/usr/bin/env node
/**
 * Verify Imported Questions Script
 * 
 * Verifies that imported questions are correctly stored in the database.
 * Checks for required fields, image data, and overall integrity.
 * 
 * Usage:
 *   npx tsx scripts/verify-imported-questions.ts
 *   npm run questions:verify
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface VerificationStats {
  totalQuestions: number;
  activeQuestions: number;
  mathQuestions: number;
  readingQuestions: number;
  withImages: number;
  withExplanations: number;
  approved: number;
  pending: number;
  byCategory: Record<string, number>;
  byDifficulty: Record<string, number>;
  recentlyImported: number;
  issues: string[];
}

async function verifyImportedQuestions() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Question Verification Script                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('🔍 Analyzing questions in database...\n');
  
  const stats: VerificationStats = {
    totalQuestions: 0,
    activeQuestions: 0,
    mathQuestions: 0,
    readingQuestions: 0,
    withImages: 0,
    withExplanations: 0,
    approved: 0,
    pending: 0,
    byCategory: {},
    byDifficulty: {},
    recentlyImported: 0,
    issues: []
  };
  
  try {
    // Get all questions
    const questions = await prisma.question.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    stats.totalQuestions = questions.length;
    
    console.log(`📊 Found ${questions.length} total questions\n`);
    
    if (questions.length === 0) {
      console.log('⚠️  No questions found in database.');
      console.log('   Run the import script first:');
      console.log('     npm run questions:import\n');
      return;
    }
    
    // Analyze each question
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    for (const q of questions) {
      // Count active questions
      if (q.isActive) stats.activeQuestions++;
      
      // Count by module type
      if (q.moduleType === 'math') stats.mathQuestions++;
      else if (q.moduleType === 'reading-writing') stats.readingQuestions++;
      
      // Count with images
      if (q.imageData) stats.withImages++;
      
      // Count with explanations
      if (q.explanation && q.explanation.length > 10) stats.withExplanations++;
      
      // Count by review status
      if (q.reviewStatus === 'approved') stats.approved++;
      else if (q.reviewStatus === 'pending') stats.pending++;
      
      // Count by category
      stats.byCategory[q.category] = (stats.byCategory[q.category] || 0) + 1;
      
      // Count by difficulty
      stats.byDifficulty[q.difficulty] = (stats.byDifficulty[q.difficulty] || 0) + 1;
      
      // Count recently imported (last hour)
      if (q.createdAt > oneHourAgo) stats.recentlyImported++;
      
      // Check for issues
      if (!q.question || q.question.length < 10) {
        stats.issues.push(`Question ${q.id}: Missing or invalid question text`);
      }
      
      if (!Array.isArray(q.options) || (q.options as any[]).length !== 4) {
        stats.issues.push(`Question ${q.id}: Invalid options (should be array of 4)`);
      }
      
      if (q.correctAnswer < 0 || q.correctAnswer > 3) {
        stats.issues.push(`Question ${q.id}: Invalid correct answer index (${q.correctAnswer})`);
      }
      
      if (!q.explanation || q.explanation.length < 10) {
        stats.issues.push(`Question ${q.id}: Missing or short explanation`);
      }
      
      if (!['math', 'reading-writing'].includes(q.moduleType)) {
        stats.issues.push(`Question ${q.id}: Invalid module type (${q.moduleType})`);
      }
    }
    
    // Print detailed statistics
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     Verification Results                                   ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║ Total Questions:           ${String(stats.totalQuestions).padStart(4)}                        ║`);
    console.log(`║ Active Questions:          ${String(stats.activeQuestions).padStart(4)}                        ║`);
    console.log(`║ Recently Imported (<1hr):  ${String(stats.recentlyImported).padStart(4)}                        ║`);
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║ Math Questions:            ${String(stats.mathQuestions).padStart(4)}                        ║`);
    console.log(`║ Reading/Writing Questions: ${String(stats.readingQuestions).padStart(4)}                        ║`);
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║ With Images/Diagrams:      ${String(stats.withImages).padStart(4)}                        ║`);
    console.log(`║ With Explanations:         ${String(stats.withExplanations).padStart(4)}                        ║`);
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║ Approved:                  ${String(stats.approved).padStart(4)}                        ║`);
    console.log(`║ Pending Review:            ${String(stats.pending).padStart(4)}                        ║`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    // Print category breakdown
    if (Object.keys(stats.byCategory).length > 0) {
      console.log('📚 Questions by Category:');
      const sortedCategories = Object.entries(stats.byCategory)
        .sort((a, b) => b[1] - a[1]);
      
      for (const [category, count] of sortedCategories) {
        const bar = '█'.repeat(Math.min(count, 50));
        console.log(`   ${category.padEnd(25)} ${String(count).padStart(3)} ${bar}`);
      }
      console.log('');
    }
    
    // Print difficulty breakdown
    if (Object.keys(stats.byDifficulty).length > 0) {
      console.log('📊 Questions by Difficulty:');
      const difficulties = ['easy', 'medium', 'hard'];
      
      for (const difficulty of difficulties) {
        const count = stats.byDifficulty[difficulty] || 0;
        const bar = '█'.repeat(Math.min(count, 50));
        console.log(`   ${difficulty.padEnd(10)} ${String(count).padStart(3)} ${bar}`);
      }
      console.log('');
    }
    
    // Sample recent questions
    const recentQuestions = questions.slice(0, 3);
    if (recentQuestions.length > 0) {
      console.log('📝 Sample Recent Questions:\n');
      
      for (let i = 0; i < recentQuestions.length; i++) {
        const q = recentQuestions[i];
        const preview = q.question.length > 80 
          ? q.question.substring(0, 80) + '...'
          : q.question;
        
        console.log(`${i + 1}. ${preview}`);
        console.log(`   Module: ${q.moduleType} | Category: ${q.category} | Difficulty: ${q.difficulty}`);
        console.log(`   Options: ${(q.options as any[]).length} | Correct: ${q.correctAnswer}`);
        console.log(`   Image: ${q.imageData ? 'Yes' : 'No'} | Created: ${q.createdAt.toISOString()}`);
        console.log('');
      }
    }
    
    // Print issues if any
    if (stats.issues.length > 0) {
      console.log('⚠️  Issues Found:\n');
      stats.issues.forEach(issue => console.log(`   - ${issue}`));
      console.log('');
    } else {
      console.log('✅ No issues found - all questions are valid!\n');
    }
    
    // Test query for practice tests
    console.log('🧪 Testing Practice Test Query...\n');
    
    const mathTestQuestions = await prisma.question.findMany({
      where: {
        isActive: true,
        moduleType: 'math'
      },
      take: 10
    });
    
    console.log(`   ✓ Can retrieve ${mathTestQuestions.length} math questions for practice tests`);
    
    const readingTestQuestions = await prisma.question.findMany({
      where: {
        isActive: true,
        moduleType: 'reading-writing'
      },
      take: 10
    });
    
    console.log(`   ✓ Can retrieve ${readingTestQuestions.length} reading questions for practice tests\n`);
    
    // Final verdict
    if (stats.issues.length === 0 && stats.activeQuestions > 0) {
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║  ✅ VERIFICATION PASSED                                   ║');
      console.log('║  All questions are valid and ready for practice tests!    ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
    } else if (stats.issues.length > 0) {
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║  ⚠️  VERIFICATION COMPLETED WITH ISSUES                   ║');
      console.log('║  Some questions have issues that should be reviewed.      ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
    } else {
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║  ⚠️  NO ACTIVE QUESTIONS FOUND                            ║');
      console.log('║  Import questions to make them available in tests.        ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  }
}

// Run the script
verifyImportedQuestions()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
