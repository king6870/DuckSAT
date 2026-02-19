import * as fs from 'fs';
import * as path from 'path';

// Find and fix the 88 files with JSON parsing errors
async function findBrokenJsonFiles() {
  const dirs = [
    path.join('..', 'azuredev-038d-main', 'generated_questions_v2'),
    path.join('..', 'azuredev-038d-main', 'generated_questions_v3')
  ];

  const brokenFiles: Array<{file: string, error: string}> = [];
  let totalChecked = 0;

  console.log('\n🔍 Scanning for broken JSON files...\n');

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.json') && !f.includes('SUMMARY'))
      .filter(f => f.match(/202602(17|18)_/)); // Only recent batch

    for (const file of files) {
      const filePath = path.join(dir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        JSON.parse(content); // Try to parse
        totalChecked++;
      } catch (err: any) {
        brokenFiles.push({
          file: path.basename(filePath),
          error: err.message
        });
        
        if (brokenFiles.length <= 5) {
          console.log(`❌ ${file}`);
          console.log(`   Error: ${err.message}`);
          
          // Show the problematic area
          const content = fs.readFileSync(filePath, 'utf-8');
          const match = err.message.match(/position (\d+)/);
          if (match) {
            const pos = parseInt(match[1]);
            const start = Math.max(0, pos - 50);
            const end = Math.min(content.length, pos + 50);
            console.log(`   Context: ...${content.substring(start, end)}...`);
          }
          console.log('');
        }
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Valid JSON: ${totalChecked}`);
  console.log(`   ❌ Broken JSON: ${brokenFiles.length}`);
  console.log(`\n💡 Common patterns in errors:`);
  
  const errorPatterns = new Map<string, number>();
  brokenFiles.forEach(({error}) => {
    if (error.includes('Bad escaped character')) {
      errorPatterns.set('Bad escaped character', (errorPatterns.get('Bad escaped character') || 0) + 1);
    } else if (error.includes('Unexpected token')) {
      errorPatterns.set('Unexpected token', (errorPatterns.get('Unexpected token') || 0) + 1);
    } else {
      errorPatterns.set('Other', (errorPatterns.get('Other') || 0) + 1);
    }
  });
  
  errorPatterns.forEach((count, pattern) => {
    console.log(`   - ${pattern}: ${count} files`);
  });
}

findBrokenJsonFiles();
