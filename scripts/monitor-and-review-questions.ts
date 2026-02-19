/**
 * Monitor and review generated questions in batches of 10
 * Run with: npx tsx scripts/monitor-and-review-questions.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface QuestionData {
  question: string;
  choices: string[];
  correctAnswer: string;
  solution?: string;
  explanation?: string;
  visualType?: string;
  subtopic?: string;
  difficultyScore?: number;
  imageData?: string;
}

async function reviewQuestionsBatch(files: string[], batchNumber: number) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📋 BATCH ${batchNumber} REVIEW (Questions ${(batchNumber - 1) * 10 + 1}-${batchNumber * 10})`);
  console.log(`${'='.repeat(80)}\n`);

  let qualityIssues = 0;
  let withDiagrams = 0;
  let goodQuestions = 0;

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const filename = path.basename(filePath);
    
    try {
      const rawData = fs.readFileSync(filePath, 'utf-8');
      const data: QuestionData = JSON.parse(rawData);

      console.log(`\nQuestion ${(batchNumber - 1) * 10 + i + 1}:`);
      console.log(`  📄 File: ${filename}`);
      console.log(`  ❓ Question: ${data.question.substring(0, 80)}...`);
      console.log(`  ✅ Correct: ${data.correctAnswer}`);
      console.log(`  📊 Visual: ${data.visualType || 'none'}`);
      console.log(`  🎯 Difficulty: ${data.difficultyScore || 'N/A'}`);
      console.log(`  📚 Topic: ${data.subtopic || 'general'}`);
      
      // Check if has diagram
      if (data.imageData) {
        withDiagrams++;
        console.log(`  🖼️  Has diagram: YES (${Math.round(data.imageData.length / 1024)} KB)`);
      }

      // Quality checks
      const issues: string[] = [];
      
      if (!data.question || data.question.length < 20) {
        issues.push('Question too short');
      }
      
      if (!data.choices || data.choices.length !== 4) {
        issues.push('Invalid choices (need exactly 4)');
      }
      
      if (!data.correctAnswer || !['A', 'B', 'C', 'D'].includes(data.correctAnswer)) {
        issues.push('Invalid correct answer');
      }
      
      if (!data.solution && !data.explanation) {
        issues.push('Missing explanation');
      }
      
      if (data.visualType && !['none', 'geometry', 'function-graph', 'bar-chart', 'system-of-equations'].includes(data.visualType)) {
        issues.push(`Unknown visual type: ${data.visualType}`);
      }

      if (issues.length > 0) {
        qualityIssues++;
        console.log(`  ⚠️  Issues: ${issues.join(', ')}`);
      } else {
        goodQuestions++;
        console.log(`  ✅ Quality: GOOD`);
      }

    } catch (error) {
      qualityIssues++;
      console.log(`  ❌ Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log(`\n${'-'.repeat(80)}`);
  console.log(`📊 BATCH ${batchNumber} SUMMARY:`);
  console.log(`   ✅ Good questions: ${goodQuestions}/${files.length}`);
  console.log(`   ⚠️  Questions with issues: ${qualityIssues}`);
  console.log(`   🖼️  Questions with diagrams: ${withDiagrams}`);
  console.log(`   📈 Quality rate: ${Math.round((goodQuestions / files.length) * 100)}%`);
  console.log(`${'-'.repeat(80)}\n`);

  return {
    goodQuestions,
    qualityIssues,
    withDiagrams,
    total: files.length
  };
}

async function monitorGeneration() {
  const baseDir = path.join(__dirname, '../../azuredev-038d-main/generated_questions_v3/');
  
  console.log('\n🔍 Starting quality review monitoring...');
  console.log(`📁 Watching directory: ${baseDir}\n`);

  // Get all JSON files (excluding SUMMARY files)
  const allFiles = fs.readdirSync(baseDir)
    .filter(f => f.endsWith('.json') && !f.startsWith('SUMMARY'))
    .map(f => path.join(baseDir, f))
    .sort((a, b) => {
      const statA = fs.statSync(a);
      const statB = fs.statSync(b);
      return statA.mtime.getTime() - statB.mtime.getTime();
    });

  console.log(`📊 Found ${allFiles.length} total question files\n`);

  // Get files from today only
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const todayFiles = allFiles.filter(f => path.basename(f).includes(today));

  console.log(`📅 Today's files: ${todayFiles.length}\n`);

  // Review in batches of 10
  const batchSize = 10;
  const batches = Math.ceil(todayFiles.length / batchSize);

  let totalGood = 0;
  let totalIssues = 0;
  let totalDiagrams = 0;

  for (let i = 0; i < batches; i++) {
    const batchFiles = todayFiles.slice(i * batchSize, (i + 1) * batchSize);
    
    if (batchFiles.length === 0) break;

    const result = await reviewQuestionsBatch(batchFiles, i + 1);
    totalGood += result.goodQuestions;
    totalIssues += result.qualityIssues;
    totalDiagrams += result.withDiagrams;
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 OVERALL SUMMARY`);
  console.log(`${'='.repeat(80)}`);
  console.log(`   📝 Total questions reviewed: ${todayFiles.length}`);
  console.log(`   ✅ Good questions: ${totalGood} (${Math.round((totalGood / todayFiles.length) * 100)}%)`);
  console.log(`   ⚠️  Questions with issues: ${totalIssues}`);
  console.log(`   🖼️  Questions with diagrams: ${totalDiagrams} (${Math.round((totalDiagrams / todayFiles.length) * 100)}%)`);
  console.log(`${'='.repeat(80)}\n`);
}

// Run the monitoring
monitorGeneration();
