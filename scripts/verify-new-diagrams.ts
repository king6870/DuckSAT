import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface QuestionData {
  question: string;
  imageData?: string;
  visualType?: string;
}

const files = [
  'math_01_20260217_102937.json',
  'math_02_20260217_103032.json',
  'math_03_20260217_103104.json'
];

const questionsDir = path.join(process.cwd(), '..', 'azuredev-038d-main', 'generated_questions_v3');

console.log('🔍 Verifying NEW generated question diagrams\n');
console.log('📂 Directory:', questionsDir, '\n');

const results: Array<{file: string, hasImage: boolean, imageLength: number, imageHash: string, question: string}> = [];

for (const file of files) {
  const filePath = path.join(questionsDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${file}`);
    continue;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as QuestionData;
  
  const hasImage = !!data.imageData;
  const imageLength = data.imageData?.length || 0;
  const imageHash = data.imageData ? crypto.createHash('md5').update(data.imageData).digest('hex').substring(0, 16) : 'NONE';
  const questionPreview = data.question.substring(0, 80);
  
  results.push({
    file,
    hasImage,
    imageLength,
    imageHash,
    question: questionPreview
  });
  
  console.log(`📄 File: ${file}`);
  console.log(`   ✅ Has imageData: ${hasImage ? 'YES' : 'NO'}`);
  console.log(`   📊 Image length: ${imageLength.toLocaleString()} chars`);
  console.log(`   🔑 Hash (first 16): ${imageHash}`);
  console.log(`   📝 Question: ${questionPreview}...`);
  console.log(`   🎨 Visual type: ${data.visualType || 'unknown'}\n`);
}

// Check uniqueness
const hashes = results.map(r => r.imageHash);
const uniqueHashes = new Set(hashes);

console.log('═'.repeat(60));
console.log('📊 VERIFICATION SUMMARY');
console.log('═'.repeat(60));
console.log(`Total files checked: ${results.length}`);
console.log(`Files with imageData: ${results.filter(r => r.hasImage).length}`);
console.log(`Unique image hashes: ${uniqueHashes.size}`);
console.log(`Average image size: ${Math.round(results.reduce((sum, r) => sum + r.imageLength, 0) / results.length).toLocaleString()} chars\n`);

if (uniqueHashes.size === results.length && uniqueHashes.size > 0) {
  console.log('✅ PASSED: All diagrams are UNIQUE!');
  console.log('✅ READY for import to database\n');
} else if (hashes.some(h => h === 'NONE')) {
  console.log('❌ FAILED: Some questions missing imageData');
  console.log('❌ DO NOT IMPORT\n');
} else {
  console.log('❌ FAILED: Duplicate diagrams detected!');
  console.log('❌ DO NOT IMPORT\n');
}
