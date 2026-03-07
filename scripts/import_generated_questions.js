// Import all generated SAT questions (math and reading) into the database using Prisma
// Usage: node scripts/import_generated_questions.js

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const previewDir = path.join(__dirname, '../question-generation/output/preview');

function extractMathQuestion(html) {
  // Extract question, choices, and diagram (base64) from HTML
  const questionMatch = html.match(/<strong>Question:<\/strong>\s*([^<]+)/);
  const choicesMatch = [...html.matchAll(/<li>([^<]+)<\/li>/g)].map(m => m[1]);
  const diagramMatch = html.match(/<img src="data:image\/png;base64,([^"']+)/);
  return {
    question: questionMatch ? questionMatch[1].trim() : '',
    choices: choicesMatch,
    img_base64: diagramMatch ? diagramMatch[1] : null
  };
}

function extractReadingQuestion(html) {
  // Extract passage, questions, and answers from HTML
  const passageMatch = html.match(/<strong>Passage:<\/strong><br>([\s\S]*?)<\/div>/);
  const qaMatches = [...html.matchAll(/<b>Q\d+:<\/b>\s*([^<]+)<br><span[^>]*><b>Answer:<\/b>\s*([^<]+)<\/span>/g)];
  return {
    passage: passageMatch ? passageMatch[1].trim() : '',
    questions: qaMatches.map(m => m[1]),
    answers: qaMatches.map(m => m[2])
  };
}

async function importMathQuestions() {
  for (let i = 1; i <= 100; i++) {
    const file = path.join(previewDir, `math-question-${i}.html`);
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8');
    const { question, choices, img_base64 } = extractMathQuestion(html);
    if (!question || choices.length === 0) continue;
    await prisma.questions.create({
      data: {
        moduleType: 'math',
        question,
        options: JSON.stringify(choices),
        imageData: img_base64 ? Buffer.from(img_base64, 'base64') : null,
        imageMimeType: img_base64 ? 'image/png' : null,
        isActive: true,
        tags: JSON.stringify(['SAT', 'math', 'generated'])
      }
    });
    console.log(`Imported math-question-${i}`);
  }
}

async function importReadingQuestions() {
  for (let i = 1; i <= 100; i++) {
    const file = path.join(previewDir, `reading-question-${i}.html`);
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8');
    const { passage, questions, answers } = extractReadingQuestion(html);
    if (!passage || questions.length === 0) continue;
    await prisma.questions.create({
      data: {
        moduleType: 'reading-writing',
        question: passage,
        options: JSON.stringify(questions),
        explanation: JSON.stringify(answers),
        isActive: true,
        tags: JSON.stringify(['SAT', 'reading', 'generated'])
      }
    });
    console.log(`Imported reading-question-${i}`);
  }
}

async function main() {
  await importMathQuestions();
  await importReadingQuestions();
  await prisma.$disconnect();
  console.log('All questions imported.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
