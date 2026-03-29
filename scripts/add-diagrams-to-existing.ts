/**
 * Add diagrams to existing questions that don't have them yet.
 * For questions in visual categories (geometry, data-analysis, advanced-math),
 * uses Azure OpenAI to generate matplotlib code, renders it to PNG,
 * and updates the question with imageData.
 *
 * This is much faster than generating new questions (1 API call vs 2).
 *
 * Usage:
 *   npx tsx scripts/add-diagrams-to-existing.ts --count 100
 *   npx tsx scripts/add-diagrams-to-existing.ts --count 100 --category geometry
 *   npx tsx scripts/add-diagrams-to-existing.ts --dry-run --count 10
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import { AzureOpenAI } from 'openai';
import { execSync } from 'child_process';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

const openai = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview',
});
const MODEL = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5-nano';

// Categories that should have visual diagrams
const VISUAL_CATEGORIES: Record<string, string> = {
  'geometry': 'geometry',
  'problem-solving-data-analysis': 'bar-chart',
  'advanced-math': 'function-graph',
  'algebra': 'function-graph',
};

const MATPLOTLIB_PROMPT = `You are an expert matplotlib programmer. Given a math question, generate COMPLETE matplotlib code that creates a diagram/chart to accompany this question.

CRITICAL RULES:
- Define a variable called 'buffer' (BytesIO)
- Use plt.savefig(buffer, format='png', bbox_inches='tight', dpi=150, facecolor='white')
- Use plt.close() at the end
- DO NOT call plt.show()
- Import NOTHING - assume matplotlib.pyplot as plt, numpy as np, BytesIO are available
- Use figsize=(8, 6) for charts, (8, 8) for geometry
- Use clear, large fonts (fontsize=12+)
- For geometry: use ax.set_aspect('equal'), draw shapes with annotations
- For charts: include title, axis labels, grid
- Make diagrams clean, professional, SAT-exam style

Return ONLY a JSON object: {"code": "complete python code", "diagram_description": "brief description of what the diagram shows", "visualType": "geometry|bar-chart|scatter-plot|function-graph|line-graph|pie-chart"}`;

interface QuestionRow {
  id: string;
  question: string;
  category: string;
  subtopic: string | null;
  difficulty: string;
}

async function generateDiagramForQuestion(q: QuestionRow): Promise<{
  imageBase64: string;
  description: string;
  visualType: string;
} | null> {
  try {
    // Step 1: Get matplotlib code from AI
    const resp = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: MATPLOTLIB_PROMPT },
        { role: 'user', content: `Generate a diagram for this SAT ${q.category} question:\n\n${q.question}\n\nCategory: ${q.category}\nSubtopic: ${q.subtopic || 'general'}\nDifficulty: ${q.difficulty}` },
      ],
      response_format: { type: 'json_object' },
    });

    const data = JSON.parse(resp.choices[0].message.content || '{}');
    const code = data.code;
    if (!code) return null;

    // Step 2: Render matplotlib code via Python
    const tempDir = join(__dirname, '..', 'generated-batches', 'diagram-batches', '.temp');
    if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });

    const codeFile = join(tempDir, `render_${q.id}.py`);
    const outputFile = join(tempDir, `output_${q.id}.txt`);

    // Write a Python wrapper that executes the code and outputs base64
    const wrapper = `
import sys
import base64
from io import BytesIO
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

try:
    buffer = None
    code = ${JSON.stringify(code)}
    # Safety: remove dangerous calls
    safe_lines = []
    for line in code.splitlines():
        if any(bad in line for bad in ['plt.show', 'input(', 'os.system', 'subprocess', 'exec(', 'eval(']):
            safe_lines.append('# ' + line)
        else:
            safe_lines.append(line)
    safe_code = '\\n'.join(safe_lines)
    
    exec_globals = {'BytesIO': BytesIO, 'plt': plt, 'np': np, 'matplotlib': matplotlib}
    exec(safe_code, exec_globals)
    
    buf = exec_globals.get('buffer')
    if buf is None:
        for v in exec_globals.values():
            if isinstance(v, BytesIO):
                buf = v
                break
    
    if buf is None:
        print("ERROR: No buffer found", file=sys.stderr)
        sys.exit(1)
    
    buf.seek(0)
    data = buf.getvalue()
    if len(data) < 100:
        print("ERROR: Empty image", file=sys.stderr)
        sys.exit(1)
    
    b64 = base64.b64encode(data).decode('ascii')
    with open(${JSON.stringify(outputFile)}, 'w') as f:
        f.write(b64)
    print("OK")
except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    sys.exit(1)
finally:
    plt.close('all')
`;

    writeFileSync(codeFile, wrapper, 'utf-8');

    try {
      execSync(`.venv\\Scripts\\python "${codeFile}"`, {
        cwd: join(__dirname, '..'),
        timeout: 30000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (e: any) {
      console.log(`    ⚠ Python render failed: ${e.stderr?.toString().substring(0, 100)}`);
      return null;
    }

    if (!existsSync(outputFile)) return null;
    const b64 = readFileSync(outputFile, 'utf-8').trim();
    if (b64.length < 200) return null;

    // Cleanup temp files
    try {
      const fs = require('fs');
      fs.unlinkSync(codeFile);
      fs.unlinkSync(outputFile);
    } catch {}

    return {
      imageBase64: b64,
      description: data.diagram_description || 'Diagram for question',
      visualType: data.visualType || VISUAL_CATEGORIES[q.category] || 'geometry',
    };
  } catch (e: any) {
    console.log(`    ⚠ Error: ${e.message?.substring(0, 120)}`);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const count = parseInt(args.find((_, i, a) => a[i - 1] === '--count') || '50');
  const categoryFilter = args.find((_, i, a) => a[i - 1] === '--category');
  const dryRun = args.includes('--dry-run');

  console.log(`\n🖼️  Add Diagrams to Existing Questions`);
  console.log(`${'═'.repeat(50)}`);
  console.log(`   Target: ${count} questions`);
  if (categoryFilter) console.log(`   Category: ${categoryFilter}`);
  if (dryRun) console.log(`   DRY RUN - no DB updates`);

  // Find questions without diagrams in visual categories
  const categories = categoryFilter ? [categoryFilter] : Object.keys(VISUAL_CATEGORIES);
  
  const questions = await prisma.question.findMany({
    where: {
      isActive: true,
      imageData: null,
      category: { in: categories },
    },
    select: {
      id: true,
      question: true,
      category: true,
      subtopic: true,
      difficulty: true,
    },
    take: count,
    orderBy: { createdAt: 'desc' },
  });

  console.log(`   Found: ${questions.length} questions without diagrams\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    process.stdout.write(`  [${i + 1}/${questions.length}] ${q.category}/${q.subtopic || 'gen'}... `);

    const result = await generateDiagramForQuestion(q);
    if (!result) {
      failed++;
      console.log('✗');
      continue;
    }

    if (!dryRun) {
      await prisma.question.update({
        where: { id: q.id },
        data: {
          imageData: Buffer.from(result.imageBase64, 'base64'),
          imageMimeType: 'image/png',
          imageAlt: result.description.substring(0, 500),
          visualType: result.visualType,
        },
      });
    }

    success++;
    console.log(`✓ (${result.visualType}, ${result.imageBase64.length} chars)`);

    // Rate limit
    await new Promise((r) => setTimeout(r, 500));
  }

  // Stats
  const diagramCount = await prisma.question.count({
    where: { isActive: true, imageData: { not: null } },
  });
  const totalCount = await prisma.question.count({ where: { isActive: true } });
  const pct = ((diagramCount / totalCount) * 100).toFixed(1);

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`📊 RESULTS`);
  console.log(`   Added diagrams: ${success}`);
  console.log(`   Failed: ${failed}`);
  console.log(`\n📈 DATABASE:`);
  console.log(`   Total: ${totalCount}`);
  console.log(`   With diagrams: ${diagramCount} (${pct}%)`);
  console.log(`   Target 25%: ${Math.ceil(totalCount * 0.25)} needed`);
  console.log(`   Remaining: ${Math.max(0, Math.ceil(totalCount * 0.25) - diagramCount)}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
