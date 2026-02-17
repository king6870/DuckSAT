import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const newQuestionIDs = [
  'cmlqybvto0000iulwmt6ll49w',
  'cmlqybvx00001iulwlvjkcuuy',
  'cmlqybvyv0002iulwtbbzc7y7'
];

async function verifyNewQuestions() {
  console.log('🔍 Verifying 3 NEW questions in database\n');

  const questions = await prisma.question.findMany({
    where: {
      id: { in: newQuestionIDs }
    },
    select: {
      id: true,
      question: true,
      imageData: true
    }
  });

  console.log(`Found ${questions.length} of 3 new questions in database\n`);

  const hashes: string[] = [];

  for (const q of questions) {
    if (!q.imageData) {
      console.log(`❌ Question ${q.id}: NO imageData!`);
      continue;
    }

    const hash = crypto.createHash('md5').update(q.imageData).digest('hex');
    hashes.push(hash);

    console.log(`📄 Question: ${q.question.substring(0, 60)}...`);
    console.log(`   ID: ${q.id}`);
    console.log(`   Hash: ${hash.substring(0, 16)}...`);
    console.log(`   Size: ${q.imageData.length} bytes\n`);
  }

  // Check uniqueness
  const uniqueHashes = new Set(hashes);
  
  console.log('═'.repeat(60));
  console.log(`📊 New questions have ${uniqueHashes.size} UNIQUE hashes out of ${hashes.length} total`);
  
  if (uniqueHashes.size === 3) {
    console.log('✅ All 3 new questions have DIFFERENT diagrams!\n');
  } else {
    console.log(`❌ PROBLEM: Only ${uniqueHashes.size} unique diagrams among new questions!\n`);
  }

  // Now check if any of these hashes match existing questions
  const allQuestions = await prisma.question.findMany({
    where: {
      imageData: { not: null },
      id: { notIn: newQuestionIDs } // Exclude our new ones
    },
    select: {
      id: true,
      imageData: true,
      question: true
    }
  });

  console.log(`🔍 Checking against ${allQuestions.length} existing questions...\n`);

  for (const newHash of hashes) {
    const matches = allQuestions.filter(q => {
      if (!q.imageData) return false;
      const oldHash = crypto.createHash('md5').update(q.imageData).digest('hex');
      return oldHash === newHash;
    });

    if (matches.length > 0) {
      console.log(`⚠️  Hash ${newHash.substring(0, 16)} MATCHES ${matches.length} existing question(s):`);
      matches.forEach(m => console.log(`     - ${m.id}: ${m.question.substring(0, 50)}...`));
      console.log();
    }
  }

  await prisma.$disconnect();
}

verifyNewQuestions().catch(console.error);
