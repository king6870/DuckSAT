/**
 * Wait for generation to complete and then run quality review
 * Run with: npx tsx scripts/wait-and-review.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

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

async function waitForCompletion(targetCount: number = 100): Promise<string[]> {
  const baseDir = path.join(__dirname, '../../azuredev-038d-main/generated_questions_v3/');
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  
  console.log('\n⏳ Waiting for generation to complete...');
  console.log(`🎯 Target: ${targetCount} questions\n`);

  let lastCount = 0;
  let stableCount = 0;
  
  while (true) {
    const files = fs.readdirSync(baseDir)
      .filter(f => f.endsWith('.json') && !f.startsWith('SUMMARY') && f.includes(today))
      .filter(f => f.includes('14:') || f.includes('15:') || f.includes('16:') || f.includes('17:')); // Afternoon files
    
    const count = files.length;
    
    if (count !== lastCount) {
      const progress = Math.round((count / targetCount) * 100);
      const time = new Date().toLocaleTimeString();
      console.log(`[${time}] 📈 Progress: ${count}/${targetCount} (${progress}%) - ${targetCount - count} remaining`);
      lastCount = count;
      stableCount = 0;
    } else {
      stableCount++;
    }
    
    // If count hasn't changed for 3 minutes (6 checks), assume complete
    if (stableCount >= 6 && count >= targetCount * 0.8) { // At least 80% complete
      console.log(`\n✅ Generation appears complete: ${count} questions generated\n`);
      return files.map(f => path.join(baseDir, f));
    }
    
    // If we hit the target exactly
    if (count >= targetCount) {
      console.log(`\n🎉 Target reached: ${count} questions generated!\n`);
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s to catch stragglers
      return files.map(f => path.join(baseDir, f));
    }
    
    await new Promise(resolve => setTimeout(resolve, 30000)); // Check every 30 seconds
  }
}

async function reviewQuestion(filePath: string): Promise<{
  isGood: boolean;
  hasDiagram: boolean;
  issues: string[];
  data: QuestionData;
}> {
  try {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const data: QuestionData = JSON.parse(rawData);
    
    const issues: string[] = [];
    
    // Quality checks
    if (!data.question || data.question.length < 20) {
      issues.push('Question too short');
    }
    
    if (!data.choices || data.choices.length !== 4) {
      issues.push('Invalid choices count');
    }
    
    if (!data.correctAnswer || !['A', 'B', 'C', 'D'].includes(data.correctAnswer)) {
      issues.push('Invalid correct answer');
    }
    
    if (!data.solution && !data.explanation) {
      issues.push('Missing explanation');
    }
    
    const hasDiagram = !!data.imageData;
    
    return {
      isGood: issues.length === 0,
      hasDiagram,
      issues,
      data
    };
  } catch (error) {
    return {
      isGood: false,
      hasDiagram: false,
      issues: ['File read error'],
      data: {} as QuestionData
    };
  }
}

async function reviewAllQuestions() {
  try {
    console.log('🔍 Starting comprehensive quality review...\n');
    
    // Wait for generation to complete
    const files = await waitForCompletion(100);
    
    console.log('═'.repeat(80));
    console.log('📋 QUALITY REVIEW REPORT');
    console.log('═'.repeat(80));
    console.log();
    
    let totalGood = 0;
    let totalIssues = 0;
    let totalDiagrams = 0;
    let mathCount = 0;
    let readingCount = 0;
    
    // Review in batches of 10
    for (let batch = 0; batch < Math.ceil(files.length / 10); batch++) {
      const batchFiles = files.slice(batch * 10, (batch + 1) * 10);
      
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`📦 BATCH ${batch + 1} (Questions ${batch * 10 + 1}-${Math.min((batch + 1) * 10, files.length)})`);
      console.log(`${'─'.repeat(80)}\n`);
      
      let batchGood = 0;
      let batchIssues = 0;
      let batchDiagrams = 0;
      
      for (let i = 0; i < batchFiles.length; i++) {
        const filePath = batchFiles[i];
        const filename = path.basename(filePath);
        const questionNum = batch * 10 + i + 1;
        
        const result = await reviewQuestion(filePath);
        
        // Count module types
        if (filename.startsWith('math_')) mathCount++;
        if (filename.startsWith('reading_')) readingCount++;
        
        console.log(`Q${questionNum.toString().padStart(3, '0')}: ${filename}`);
        console.log(`      ${result.data.question?.substring(0, 70)}...`);
        console.log(`      ${result.isGood ? '✅ GOOD' : '⚠️  ISSUES: ' + result.issues.join(', ')}`);
        if (result.hasDiagram) {
          const size = Math.round(result.data.imageData!.length / 1024);
          console.log(`      🖼️  Diagram: ${size} KB - ${result.data.visualType || 'unknown type'}`);
          batchDiagrams++;
        }
        console.log();
        
        if (result.isGood) {
          batchGood++;
        } else {
          batchIssues++;
        }
      }
      
      totalGood += batchGood;
      totalIssues += batchIssues;
      totalDiagrams += batchDiagrams;
      
      console.log(`Batch ${batch + 1} Summary: ✅ ${batchGood}/10 good, 🖼️  ${batchDiagrams} with diagrams`);
    }
    
    // Final summary
    console.log(`\n${'═'.repeat(80)}`);
    console.log('📊 FINAL SUMMARY');
    console.log(`${'═'.repeat(80)}`);
    console.log(`\n📝 Total Questions: ${files.length}`);
    console.log(`   📐 Math: ${mathCount}`);
    console.log(`   📖 Reading: ${readingCount}`);
    console.log(`\n✅ Quality:`);
    console.log(`   Good questions: ${totalGood} (${Math.round((totalGood / files.length) * 100)}%)`);
    console.log(`   Questions with issues: ${totalIssues}`);
    console.log(`\n🖼️  Diagrams:`);
    console.log(`   Questions with diagrams: ${totalDiagrams} (${Math.round((totalDiagrams / files.length) * 100)}%)`);
    console.log(`\n${'═'.repeat(80)}\n`);
    
    // Save review report
    const reportPath = path.join(__dirname, '../review-report.txt');
    const report = `Quality Review Report - ${new Date().toISOString()}\n` +
      `Total: ${files.length} questions\n` +
      `Good: ${totalGood} (${Math.round((totalGood / files.length) * 100)}%)\n` +
      `With Diagrams: ${totalDiagrams} (${Math.round((totalDiagrams / files.length) * 100)}%)\n` +
      `Math: ${mathCount}, Reading: ${readingCount}\n`;
    
    fs.writeFileSync(reportPath, report);
    console.log(`📄 Review report saved to: ${reportPath}\n`);
    
  } catch (error) {
    console.error('❌ Error during review:', error);
    throw error;
  }
}

// Run the wait and review process
reviewAllQuestions();
