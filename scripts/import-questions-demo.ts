import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Map question types to SAT categories
const TYPE_TO_CATEGORY_MAP: Record<string, { category: string; moduleType: string }> = {
  'Equations': { category: 'algebra', moduleType: 'math' },
  'Geometry': { category: 'geometry', moduleType: 'math' },
  'WordProblems': { category: 'word-problems', moduleType: 'math' },
  'Functions': { category: 'functions', moduleType: 'math' },
  'Data': { category: 'data-analysis', moduleType: 'math' },
  'FillInBlank': { category: 'reading-comprehension', moduleType: 'reading-writing' },
  'Details': { category: 'reading-comprehension', moduleType: 'reading-writing' },
  'Summary': { category: 'reading-comprehension', moduleType: 'reading-writing' },
  'PassageDiagram': { category: 'reading-comprehension', moduleType: 'reading-writing' },
  'Research': { category: 'reading-comprehension', moduleType: 'reading-writing' }
};

// Convert answer letter to index
function answerToIndex(answer: string): number {
  const match = answer.match(/^([A-D])/i);
  if (!match) return 0;
  return match[1].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
}

// Create SVG diagram from description
function createDiagramFromDescription(description: string): Buffer | null {
  if (!description) return null;
  
  // Create a simple SVG with the description
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect fill="#f8f9fa" width="400" height="300"/>
  <text x="200" y="30" text-anchor="middle" font-size="16" font-family="Arial" fill="#333" font-weight="bold">Diagram</text>
  <foreignObject x="20" y="60" width="360" height="220">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial; font-size: 14px; color: #555; padding: 10px; background: white; border: 2px solid #ddd; border-radius: 8px; height: 100%; overflow: auto;">
      ${description}
    </div>
  </foreignObject>
</svg>`;
  
  return Buffer.from(svg, 'utf-8');
}

async function importQuestions(jsonFilePath: string) {
  console.log(`\n📂 Reading questions from: ${jsonFilePath}`);
  
  const fileContent = fs.readFileSync(jsonFilePath, 'utf-8');
  const questions = JSON.parse(fileContent);
  
  console.log(`📝 Found ${questions.length} questions to import\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const [index, q] of questions.entries()) {
    try {
      console.log(`[${index + 1}/${questions.length}] Importing: ${q.question.substring(0, 50)}...`);
      
      // Get category and module type from question type
      const typeInfo = TYPE_TO_CATEGORY_MAP[q.type] || { 
        category: 'general', 
        moduleType: q.type.includes('Reading') || q.passage ? 'reading-writing' : 'math' 
      };
      
      // Convert answer to index
      const correctAnswerIndex = answerToIndex(q.correct_answer);
      
      // Create diagram if description exists
      let imageData: Buffer | null = null;
      if (q.diagram_description) {
        imageData = createDiagramFromDescription(q.diagram_description);
        console.log(`  └─ Created diagram from description`);
      }
      
      // Create question in database
      await prisma.question.create({
        data: {
          question: q.question,
          passage: q.passage || null,
          options: q.choices,
          correctAnswer: correctAnswerIndex,
          explanation: q.explanation,
          moduleType: typeInfo.moduleType,
          category: typeInfo.category,
          difficulty: 'medium',
          timeEstimate: 90,
          imageData: imageData,
          imageMimeType: imageData ? 'image/svg+xml' : null,
          chartData: q.diagram_description ? { description: q.diagram_description } : null,
          source: 'Azure OpenAI GPT-4',
          tags: [q.type, 'AI-generated'],
          isActive: true
        }
      });
      
      successCount++;
      console.log(`  ✅ Imported successfully`);
    } catch (error) {
      errorCount++;
      console.error(`  ❌ Error importing question ${index + 1}:`, error);
    }
  }
  
  console.log(`\n╔═══════════════════════════════════════╗`);
  console.log(`║     Import Summary                    ║`);
  console.log(`╠═══════════════════════════════════════╣`);
  console.log(`║ ✅ Successful: ${String(successCount).padStart(2)}                    ║`);
  console.log(`║ ❌ Failed:     ${String(errorCount).padStart(2)}                    ║`);
  console.log(`║ 📊 Total:      ${String(questions.length).padStart(2)}                    ║`);
  console.log(`╚═══════════════════════════════════════╝\n`);
}

// Get file path from command line
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('❌ Error: Please provide a JSON file path');
  console.log('Usage: npx tsx scripts/import-questions-demo.ts <json-file-path>');
  process.exit(1);
}

const filePath = path.resolve(args[0]);

if (!fs.existsSync(filePath)) {
  console.error(`❌ Error: File not found: ${filePath}`);
  process.exit(1);
}

importQuestions(filePath)
  .then(() => {
    console.log('✨ Import completed!');
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Import failed:', error);
    prisma.$disconnect();
    process.exit(1);
  });
