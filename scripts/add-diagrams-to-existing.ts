/**
 * Add or regenerate diagrams for existing questions in visual categories.
 *
 * Pipeline:
 *   Step 1: Generate matplotlib code + diagram description with Azure OpenAI
 *   Step 2: Render matplotlib code to PNG (base64)
 *   Step 3: Run hard-rule validation (category/type/data cues)
 *   Step 4: Run diagram-question semantic matching check (NEW)
 *
 * If matching fails, retries with feedback up to --max-attempts.
 *
 * Modes:
 *   Default mode: add diagrams to questions without imageData
 *   Regeneration mode: regenerate only questions that already have imageData
 *
 * Usage:
 *   npx tsx scripts/add-diagrams-to-existing.ts --count 100
 *   npx tsx scripts/add-diagrams-to-existing.ts --count 100 --category problem-solving-data-analysis
 *   npx tsx scripts/add-diagrams-to-existing.ts --regenerate-existing --category problem-solving-data-analysis --count 50
 *   npx tsx scripts/add-diagrams-to-existing.ts --regenerate-existing --only-inaccurate --count 25
 *   npx tsx scripts/add-diagrams-to-existing.ts --regenerate-existing --only-unreviewed --count 25
 *   npx tsx scripts/add-diagrams-to-existing.ts --dry-run --regenerate-existing --count 10
 *   npx tsx scripts/add-diagrams-to-existing.ts --count 30 --source "SAT Generator QG800"
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

import { PrismaClient, Prisma } from '@prisma/client';
import { AzureOpenAI } from 'openai';
import { execFileSync } from 'child_process';
import { writeFileSync, readFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
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

const DATA_VISUAL_TYPES = new Set(['bar-chart', 'line-graph', 'scatter-plot', 'pie-chart', 'box-plot']);
const DEFAULT_MATCH_THRESHOLD = 75;
const DEFAULT_MAX_ATTEMPTS = 3;
const OPENAI_REQUEST_TIMEOUT_MS = 90000;
const DB_UPDATE_TIMEOUT_MS = 30000;
const PER_QUESTION_TIMEOUT_MS = 8 * 60 * 1000;

const VISUAL_TYPE_ALIASES: Record<string, string> = {
  'bar chart': 'bar-chart',
  'line chart': 'line-graph',
  'line graph': 'line-graph',
  'scatter plot': 'scatter-plot',
  'pie chart': 'pie-chart',
  'box plot': 'box-plot',
  'geometric diagram': 'geometry',
  'coordinate-plane': 'function-graph',
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
- Use ONLY values implied by the question/options. Do not invent unrelated values
- For problem-solving-data-analysis questions, produce data visuals (bar/line/scatter/pie/box) with explicit axes and labels
- Diagram description must clearly state what is plotted and which values/points/bars are shown

Return ONLY a JSON object: {"code": "complete python code", "diagram_description": "brief description of what the diagram shows", "visualType": "geometry|bar-chart|scatter-plot|function-graph|line-graph|pie-chart"}`;

const DIAGRAM_MATCH_CHECK_PROMPT = `You are a strict SAT diagram-question alignment reviewer.

Task: Determine whether the diagram specification actually matches the question intent.

Check all of these:
1) Diagram type matches question category and wording
2) Diagram description uses values/labels compatible with the question
3) The diagram helps answer the question (not generic or unrelated)
4) For data-analysis questions, chart type and axes are appropriate

Return ONLY JSON with keys:
{
  "isMatch": true|false,
  "matchScore": 0-100,
  "reason": "short reason",
  "issues": ["issue 1", "issue 2"]
}`;

interface QuestionRow {
  id: string;
  question: string;
  category: string;
  subtopic: string | null;
  difficulty: string;
  options: string;
  correctAnswer: number;
  explanation: string;
}

interface DiagramSpec {
  code: string;
  description: string;
  visualType: string;
}

interface MatchCheckResult {
  isMatch: boolean;
  matchScore: number;
  reason: string;
  issues: string[];
}

interface DiagramResult {
  imageBase64: string;
  description: string;
  visualType: string;
  matchScore: number;
  matchReason: string;
  attempt: number;
}

function getArgValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx < 0 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

function parseIntArg(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeVisualType(input: string | undefined, category: string): string {
  const fallback = VISUAL_CATEGORIES[category] || 'geometry';
  if (!input || !input.trim()) return fallback;

  const normalized = input.trim().toLowerCase().replace(/_/g, '-');
  if (VISUAL_TYPE_ALIASES[normalized]) return VISUAL_TYPE_ALIASES[normalized];
  return normalized;
}

function parseOptions(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item));
    }
    return [];
  } catch {
    return [];
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }) as Promise<T>;
}

async function requestDiagramSpec(q: QuestionRow, retryFeedback?: string): Promise<DiagramSpec | null> {
  try {
    const promptParts = [
      `Generate a diagram for this SAT ${q.category} question:`,
      '',
      q.question,
      '',
      `Category: ${q.category}`,
      `Subtopic: ${q.subtopic || 'general'}`,
      `Difficulty: ${q.difficulty}`,
    ];

    if (retryFeedback && retryFeedback.trim().length > 0) {
      promptParts.push('', `RETRY FEEDBACK (must fix): ${retryFeedback}`);
    }

    const resp = await withTimeout(
      openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: MATPLOTLIB_PROMPT },
          { role: 'user', content: promptParts.join('\n') },
        ],
        response_format: { type: 'json_object' },
      }),
      OPENAI_REQUEST_TIMEOUT_MS,
      'Diagram spec request'
    );

    const content = resp.choices[0]?.message?.content;
    if (typeof content !== 'string') return null;

    const parsed = JSON.parse(content) as Partial<{
      code: string;
      diagram_description: string;
      visualType: string;
    }>;

    if (!parsed.code || parsed.code.trim().length === 0) return null;

    return {
      code: parsed.code,
      description: (parsed.diagram_description || 'Diagram for question').trim(),
      visualType: normalizeVisualType(parsed.visualType, q.category),
    };
  } catch {
    return null;
  }
}

function renderDiagramCode(questionId: string, code: string): string | null {
  const tempDir = join(__dirname, '..', 'generated-batches', 'diagram-batches', '.temp');
  if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });

  const codeFile = join(tempDir, `render_${questionId}.py`);
  const outputFile = join(tempDir, `output_${questionId}.txt`);

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
        print('ERROR: No buffer found', file=sys.stderr)
        sys.exit(1)

    buf.seek(0)
    data = buf.getvalue()
    if len(data) < 150:
        print('ERROR: Empty image', file=sys.stderr)
        sys.exit(1)

    b64 = base64.b64encode(data).decode('ascii')
    with open(${JSON.stringify(outputFile)}, 'w', encoding='utf-8') as f:
        f.write(b64)
    print('OK')
except Exception as e:
    print(f'ERROR: {e}', file=sys.stderr)
    sys.exit(1)
finally:
    plt.close('all')
`;

  writeFileSync(codeFile, wrapper, 'utf-8');

  try {
    execFileSync('.venv\\Scripts\\python', [codeFile], {
      cwd: join(__dirname, '..'),
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (!existsSync(outputFile)) return null;
    const b64 = readFileSync(outputFile, 'utf-8').trim();
    if (b64.length < 200) return null;
    return b64;
  } catch {
    return null;
  } finally {
    try {
      if (existsSync(codeFile)) unlinkSync(codeFile);
      if (existsSync(outputFile)) unlinkSync(outputFile);
    } catch {
      // Ignore temp cleanup failures.
    }
  }
}

function runHardRuleMatchCheck(q: QuestionRow, spec: DiagramSpec): MatchCheckResult {
  const issues: string[] = [];
  const qLower = q.question.toLowerCase();
  const descLower = spec.description.toLowerCase();

  const isDataCategory = q.category === 'problem-solving-data-analysis';

  if (isDataCategory && !DATA_VISUAL_TYPES.has(spec.visualType)) {
    issues.push(`Data-analysis question generated non-data visual type: ${spec.visualType}`);
  }

  if (isDataCategory) {
    const hasAxisCue = /x-?axis|y-?axis|axis|horizontal|vertical/.test(descLower);
    const hasDataCue = /bar|line|scatter|plot|chart|histogram|box|table|points?/.test(descLower);
    if (!hasAxisCue || !hasDataCue) {
      issues.push('Data-analysis diagram description is missing chart/axis details.');
    }

    const numericMatches = q.question.match(/\d+(?:\.\d+)?/g) || [];
    const uniqueNumbers = Array.from(new Set(numericMatches)).slice(0, 6);
    if (uniqueNumbers.length >= 2) {
      const overlap = uniqueNumbers.filter((n) => descLower.includes(n));
      if (overlap.length === 0) {
        issues.push('Question numeric values are not reflected in diagram description.');
      }
    }
  }

  if (/triangle|circle|angle|polygon|segment/.test(qLower) && spec.visualType === 'bar-chart') {
    issues.push('Geometry-like question generated as bar chart.');
  }

  if (/bar chart|line graph|scatter plot|histogram|box plot|table/.test(qLower) && !DATA_VISUAL_TYPES.has(spec.visualType)) {
    issues.push('Question explicitly asks for data visual, but generated visualType is incompatible.');
  }

  const isMatch = issues.length === 0;
  const matchScore = isMatch ? 95 : Math.max(20, 95 - issues.length * 25);

  return {
    isMatch,
    matchScore,
    reason: isMatch
      ? 'Hard-rule validation passed.'
      : 'Hard-rule validation detected category/semantic mismatch.',
    issues,
  };
}

async function runLLMMatchCheck(q: QuestionRow, spec: DiagramSpec): Promise<MatchCheckResult | null> {
  try {
    const options = parseOptions(q.options);
    const correctOption = options[q.correctAnswer] || '';

    const payload = {
      category: q.category,
      subtopic: q.subtopic || 'general',
      difficulty: q.difficulty,
      question: q.question,
      options,
      correctAnswerIndex: q.correctAnswer,
      correctOption,
      explanation: q.explanation,
      generatedDiagram: {
        visualType: spec.visualType,
        diagramDescription: spec.description,
        codePreview: spec.code.slice(0, 1500),
      },
    };

    const resp = await withTimeout(
      openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: DIAGRAM_MATCH_CHECK_PROMPT },
          { role: 'user', content: JSON.stringify(payload) },
        ],
        response_format: { type: 'json_object' },
      }),
      OPENAI_REQUEST_TIMEOUT_MS,
      'Diagram semantic match check'
    );

    const content = resp.choices[0]?.message?.content;
    if (typeof content !== 'string') return null;

    const parsed = JSON.parse(content) as Partial<{
      isMatch: boolean;
      matchScore: number;
      reason: string;
      issues: string[];
    }>;

    const scoreRaw = Number(parsed.matchScore);
    const matchScore = Number.isFinite(scoreRaw)
      ? Math.max(0, Math.min(100, Math.round(scoreRaw)))
      : 50;

    return {
      isMatch: Boolean(parsed.isMatch),
      matchScore,
      reason: typeof parsed.reason === 'string' ? parsed.reason : 'No reason provided.',
      issues: Array.isArray(parsed.issues)
        ? parsed.issues.map((item) => String(item)).slice(0, 8)
        : [],
    };
  } catch {
    return null;
  }
}

function combineMatchChecks(
  hardCheck: MatchCheckResult,
  llmCheck: MatchCheckResult | null,
  threshold: number
): MatchCheckResult {
  if (!llmCheck) {
    return {
      ...hardCheck,
      isMatch: hardCheck.isMatch && hardCheck.matchScore >= threshold,
    };
  }

  const issues = Array.from(new Set([...hardCheck.issues, ...llmCheck.issues]));
  const combinedScore = Math.round((hardCheck.matchScore + llmCheck.matchScore) / 2);
  const isMatch = hardCheck.isMatch && llmCheck.isMatch && combinedScore >= threshold;

  return {
    isMatch,
    matchScore: combinedScore,
    reason: `HardRules: ${hardCheck.reason} | SemanticCheck: ${llmCheck.reason}`,
    issues,
  };
}

async function generateDiagramForQuestion(
  q: QuestionRow,
  maxAttempts: number,
  matchThreshold: number
): Promise<DiagramResult | null> {
  let retryFeedback = '';

  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Step 1/4: Generate diagram spec and matplotlib code.
      const spec = await requestDiagramSpec(q, retryFeedback);
      if (!spec) {
        retryFeedback = 'No valid matplotlib code was returned. Generate complete runnable code with a buffer variable.';
        continue;
      }

      // Step 2/4: Render code to image.
      const b64 = renderDiagramCode(q.id, spec.code);
      if (!b64) {
        retryFeedback = 'Matplotlib rendering failed or produced an empty image. Simplify code and ensure buffer save.';
        continue;
      }

      // Step 3/4: Hard-rule validation (category/type/description/data cues).
      const hardCheck = runHardRuleMatchCheck(q, spec);

      // Step 4/4: Diagram-question semantic matching check (NEW).
      const llmCheck = await runLLMMatchCheck(q, spec);
      const finalCheck = combineMatchChecks(hardCheck, llmCheck, matchThreshold);

      if (finalCheck.isMatch) {
        return {
          imageBase64: b64,
          description: spec.description,
          visualType: spec.visualType,
          matchScore: finalCheck.matchScore,
          matchReason: finalCheck.reason,
          attempt,
        };
      }

      const issueText = finalCheck.issues.length > 0
        ? finalCheck.issues.join(' | ')
        : finalCheck.reason;
      retryFeedback = `Mismatch detected (score ${finalCheck.matchScore}/${matchThreshold}). Fix issues: ${issueText}`;
    }

    return null;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.log(`    ⚠ Error: ${message.substring(0, 120)}`);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const count = parseIntArg(getArgValue(args, '--count'), 50);
  const categoryFilter = getArgValue(args, '--category');
  const sourceFilter = getArgValue(args, '--source');
  const regenerateExisting = args.includes('--regenerate-existing') || args.includes('--diagram-only');
  const onlyInaccurate = args.includes('--only-inaccurate');
  const onlyUnreviewed = args.includes('--only-unreviewed');
  const matchThreshold = parseIntArg(getArgValue(args, '--match-threshold'), DEFAULT_MATCH_THRESHOLD);
  const maxAttempts = parseIntArg(getArgValue(args, '--max-attempts'), DEFAULT_MAX_ATTEMPTS);
  const dryRun = args.includes('--dry-run');

  if (onlyInaccurate && onlyUnreviewed) {
    throw new Error('Choose only one filter: --only-inaccurate or --only-unreviewed');
  }

  const runRegeneration = regenerateExisting || onlyInaccurate || onlyUnreviewed;

  console.log(`\n🖼️  Add Diagrams to Existing Questions`);
  console.log(`${'═'.repeat(50)}`);
  console.log(`   Target: ${count} questions`);
  console.log(`   Mode: ${runRegeneration ? 'REGENERATE existing diagrams only' : 'ADD missing diagrams only'}`);
  console.log(`   Matching Step: ENABLED (Step 4/4, threshold ${matchThreshold}%)`);
  console.log(`   Max attempts/question: ${maxAttempts}`);
  if (categoryFilter) console.log(`   Category: ${categoryFilter}`);
  if (sourceFilter) console.log(`   Source: ${sourceFilter}`);
  if (onlyInaccurate) console.log(`   Filter: only questions marked diagramAccurate = false`);
  if (onlyUnreviewed) console.log(`   Filter: only questions marked diagramAccurate = null`);
  if (dryRun) console.log(`   DRY RUN - no DB updates`);

  // Find candidate questions in visual categories.
  const categories = categoryFilter ? [categoryFilter] : Object.keys(VISUAL_CATEGORIES);

  const where: Prisma.QuestionWhereInput = {
    isActive: true,
    category: { in: categories },
    imageData: runRegeneration ? { not: null } : null,
  };

  if (sourceFilter) {
    where.source = sourceFilter;
  }

  if (onlyInaccurate) {
    where.diagramAccurate = false;
    where.imageData = { not: null };
  }

  if (onlyUnreviewed) {
    where.diagramAccurate = null;
    where.imageData = { not: null };
  }

  const questions = await prisma.question.findMany({
    where,
    select: {
      id: true,
      question: true,
      category: true,
      subtopic: true,
      difficulty: true,
      options: true,
      correctAnswer: true,
      explanation: true,
    },
    take: count,
    orderBy: { createdAt: 'desc' },
  });

  console.log(`   Found: ${questions.length} candidate questions\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    process.stdout.write(`  [${i + 1}/${questions.length}] ${q.category}/${q.subtopic || 'gen'}... `);

    let result: DiagramResult | null;
    try {
      result = await withTimeout(
        generateDiagramForQuestion(q, maxAttempts, matchThreshold),
        PER_QUESTION_TIMEOUT_MS,
        `Question ${q.id} processing`
      );
    } catch {
      result = null;
    }

    if (!result) {
      failed++;
      console.log('✗');
      continue;
    }

    if (!dryRun) {
      const chartData = JSON.stringify({
        diagramDescription: result.description,
        visualType: result.visualType,
        matchScore: result.matchScore,
        matchReason: result.matchReason,
        checkedAt: new Date().toISOString(),
        regeneratedExisting: runRegeneration,
      });

      try {
        await withTimeout(
          prisma.question.update({
            where: { id: q.id },
            data: {
              imageData: Buffer.from(result.imageBase64, 'base64'),
              imageMimeType: 'image/png',
              imageAlt: result.description.substring(0, 500),
              visualType: result.visualType,
              chartData,
              diagramAccurate: result.matchScore >= matchThreshold,
            },
          }),
          DB_UPDATE_TIMEOUT_MS,
          `DB update for question ${q.id}`
        );
      } catch {
        failed++;
        console.log('✗');
        continue;
      }
    }

    success++;
    console.log(`✓ (${result.visualType}, match ${result.matchScore}%, attempt ${result.attempt})`);

    // Basic rate limit.
    await new Promise((r) => setTimeout(r, 500));
  }

  // Stats.
  const diagramCount = await prisma.question.count({
    where: { isActive: true, imageData: { not: null } },
  });
  const totalCount = await prisma.question.count({ where: { isActive: true } });
  const pct = ((diagramCount / totalCount) * 100).toFixed(1);

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`📊 RESULTS`);
  console.log(`   Updated diagrams: ${success}`);
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
