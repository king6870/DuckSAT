/**
 * Quick review of the 10 generated questions
 */

import * as fs from 'fs';
import * as path from 'path';

const baseDir = 'C:\\Users\\lionv\\DuckSAT\\Migration\\azuredev-038d-main\\generated_questions_v3';

const files = [
  'math_01_20260217_141730.json',
  'math_02_20260217_141958.json',
  'math_03_20260217_142038.json',
  'math_04_20260217_142245.json',
  'math_05_20260217_142424.json',
  'math_06_20260217_142623.json',
  'math_07_20260217_142703.json',
  'math_08_20260217_142943.json',
  'math_09_20260217_143206.json',
  'math_10_20260217_143413.json'
];

console.log('\n' + '='.repeat(80));
console.log('📋 QUALITY REVIEW - 10 GENERATED QUESTIONS');
console.log('='.repeat(80) + '\n');

let goodCount = 0;
let withDiagrams = 0;

files.forEach((filename, idx) => {
  const filePath = path.join(baseDir, filename);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  console.log(`Q${(idx + 1).toString().padStart(2, '0')}: ${filename}`);
  console.log(`     ${data.question.substring(0, 75)}...`);
  console.log(`     Choices: ${data.choices?.length || 0} | Answer: ${data.correctAnswer} | Visual: ${data.visualType || 'none'}`);
  
  const issues = [];
  if (!data.question || data.question.length < 20) issues.push('Short question');
  if (!data.choices || data.choices.length !== 4) issues.push('Invalid choices');
  if (!data.correctAnswer) issues.push('Missing answer');
  if (!data.solution && !data.explanation) issues.push('Missing explanation');
  
  if (data.imageData) {
    withDiagrams++;
    const kb = Math.round(data.imageData.length / 1024);
    console.log(`     🖼️  Diagram: ${kb} KB`);
  }
  
  if (issues.length === 0) {
    goodCount++;
    console.log(`     ✅ GOOD\n`);
  } else {
    console.log(`     ⚠️  Issues: ${issues.join(', ')}\n`);
  }
});

console.log('='.repeat(80));
console.log('📊 SUMMARY');
console.log('='.repeat(80));
console.log(`   Total: 10 questions`);
console.log(`   ✅ Good: ${goodCount}/10 (${goodCount * 10}%)`);
console.log(`   🖼️  With diagrams: ${withDiagrams}/10 (${withDiagrams * 10}%)`);
console.log(`   ⚠️  Issues: ${10 - goodCount}`);
console.log('='.repeat(80) + '\n');
