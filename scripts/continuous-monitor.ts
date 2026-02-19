/**
 * Continuous monitoring script for question generation with quality checks every 10 questions
 * Run with: npx tsx scripts/continuous-monitor.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface GenerationStats {
  total: number;
  math: number;
  reading: number;
  withDiagrams: number;
  lastCheck: Date;
}

async function getQuestionFiles(): Promise<string[]> {
  const baseDir = path.join(__dirname, '../../azuredev-038d-main/generated_questions_v3/');
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  
  return fs.readdirSync(baseDir)
    .filter(f => f.endsWith('.json') && !f.startsWith('SUMMARY') && f.includes(today))
    .filter(f => f.includes('14:') || f.includes('15:') || f.includes('16:') || f.includes('17:'))
    .map(f => path.join(baseDir, f));
}

async function reviewBatch(files: string[], batchNum: number): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📦 BATCH ${batchNum} REVIEW (${files.length} questions)`);
  console.log(`${'='.repeat(80)}`);
  
  let good = 0;
  let diagrams = 0;
  
  for (let i = 0; i < files.length; i++) {
    try {
      const data = JSON.parse(fs.readFileSync(files[i], 'utf-8'));
      const filename = path.basename(files[i]);
      
      const issues = [];
      if (!data.question || data.question.length < 20) issues.push('Short');
      if (!data.choices || data.choices.length !== 4) issues.push('Choices');
      if (!data.correctAnswer) issues.push('Answer');
      if (!data.solution && !data.explanation) issues.push('Explanation');
      
      const hasDiagram = !!data.imageData;
      if (hasDiagram) diagrams++;
      
      const status = issues.length === 0 ? '✅' : '⚠️ ';
      console.log(`  ${status} Q${((batchNum - 1) * 10 + i + 1).toString().padStart(3, '0')}: ${filename} ${hasDiagram ? '🖼️ ' : ''} ${issues.length > 0 ? `(${issues.join(',')})` : ''}`);
      
      if (issues.length === 0) good++;
    } catch (error) {
      console.log(`  ❌ Error reading file: ${path.basename(files[i])}`);
    }
  }
  
  console.log(`\n  Summary: ✅ ${good}/${files.length} good | 🖼️  ${diagrams} diagrams`);
  console.log(`${'='.repeat(80)}\n`);
}

async function monitor(): Promise<void> {
  console.log('\n🔍 Starting continuous monitoring...');
  console.log('🎯 Target: 100 questions (10 already completed + 90 new)');
  console.log('⏱️  Checking every 30 seconds...\n');
  
  let lastCount = 10; // We already have 10
  let lastBatchReviewed = 1;
  
  while (true) {
    try {
      const files = await getQuestionFiles();
      const currentCount = files.length;
      
      if (currentCount !== lastCount) {
        const time = new Date().toLocaleTimeString();
        const progress = Math.round((currentCount / 100) * 100);
        console.log(`[${time}] 📈 ${currentCount}/100 (${progress}%) - ${100 - currentCount} remaining`);
        
        // Review every 10 questions
        const currentBatch = Math.floor(currentCount / 10);
        if (currentBatch > lastBatchReviewed && currentCount % 10 === 0) {
          const batchFiles = files.slice((currentBatch - 1) * 10, currentCount);
          await reviewBatch(batchFiles, currentBatch);
          lastBatchReviewed = currentBatch;
        }
        
        lastCount = currentCount;
      }
      
      // Check if complete
      if (currentCount >= 100) {
        console.log(`\n${'='.repeat(80)}`);
        console.log('🎉 GENERATION COMPLETE!');
        console.log(`${'='.repeat(80)}`);
        console.log(`   Total: ${currentCount} questions`);
        
        // Final review of any remaining questions
        if (currentCount > lastBatchReviewed * 10) {
          const remainingFiles = files.slice(lastBatchReviewed * 10);
          await reviewBatch(remainingFiles, lastBatchReviewed + 1);
        }
        
        // Final statistics
        const mathFiles = files.filter(f => path.basename(f).startsWith('math_'));
        const readingFiles = files.filter(f => path.basename(f).startsWith('reading_'));
        
        let diagramCount = 0;
        let goodCount = 0;
        
        for (const file of files) {
          try {
            const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
            if (data.imageData) diagramCount++;
            
            const hasIssues = 
              !data.question || data.question.length < 20 ||
              !data.choices || data.choices.length !== 4 ||
              !data.correctAnswer ||
              (!data.solution && !data.explanation);
            
            if (!hasIssues) goodCount++;
          } catch {}
        }
        
        console.log(`\n📊 FINAL STATISTICS:`);
        console.log(`   📐 Math: ${mathFiles.length}`);
        console.log(`   📖 Reading: ${readingFiles.length}`);
        console.log(`   ✅ Good quality: ${goodCount} (${Math.round((goodCount / currentCount) * 100)}%)`);
        console.log(`   🖼️  With diagrams: ${diagramCount} (${Math.round((diagramCount / currentCount) * 100)}%)`);
        console.log(`${'='.repeat(80)}\n`);
        
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 30000)); // Check every 30 seconds
      
    } catch (error) {
      console.error('Error during monitoring:', error);
      await new Promise(resolve => setTimeout(resolve, 60000)); // Wait longer on error
    }
  }
}

// Start monitoring
monitor().catch(console.error);
