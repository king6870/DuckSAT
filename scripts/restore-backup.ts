/**
 * Restore from backup
 * 
 * Restores the database from backup-pre-migration.json
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function restore() {
  const backupPath = path.join(process.cwd(), 'backup-pre-migration.json');
  
  if (!fs.existsSync(backupPath)) {
    console.error('❌ Backup file not found:', backupPath);
    process.exit(1);
  }
  
  console.log('\n📦 Restoring from backup...');
  console.log(`   File: ${backupPath}\n`);
  
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
  
  console.log(`📊 Questions in backup: ${backup.length}\n`);
  console.log('🔄 Restoring...\n');
  
  let restored = 0;
  let errors = 0;
  
  for (const question of backup) {
    try {
      await prisma.question.update({
        where: { id: question.id },
        data: {
          question: question.question,
          explanation: question.explanation,
          options: question.options,
          passage: question.passage,
          wrongAnswerExplanations: question.wrongAnswerExplanations
        }
      });
      
      restored++;
      
      if (restored % 50 === 0) {
        console.log(`   ✓ Restored ${restored}/${backup.length}...`);
      }
    } catch (error: any) {
      errors++;
      console.error(`   ❌ Error restoring ${question.id}:`, error.message);
    }
  }
  
  console.log(`\n✅ Restore complete!`);
  console.log(`   Restored: ${restored}`);
  console.log(`   Errors: ${errors}\n`);
  
  await prisma.$disconnect();
}

restore();
