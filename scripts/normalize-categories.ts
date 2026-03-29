/**
 * Normalize question categories in the database to match the practice drill page slugs.
 * 
 * SAT Digital sections → Drill page slugs:
 *   Reading & Writing:
 *     - reading-comprehension (Information & Ideas)
 *     - grammar (Standard English Conventions)
 *     - vocabulary (Words in Context / Craft & Structure)
 *     - writing-language (Expression of Ideas / Rhetoric)
 *   Math:
 *     - algebra (Linear equations, systems, inequalities)
 *     - advanced-math (Quadratic, polynomial, exponential, rational)
 *     - geometry (Geometry & Trigonometry)
 *     - problem-solving-data-analysis (Statistics, probability, ratios)
 * 
 * Current DB categories that need remapping:
 *   reading → reading-comprehension
 *   Reading Comprehension → reading-comprehension
 *   reading-writing → reading-comprehension
 *   rhetoric (R&W) → writing-language
 *   synthesis → writing-language
 *   quadratic-equations → advanced-math
 *   linear-functions → algebra
 *   statistics → problem-solving-data-analysis
 *   math → algebra
 *   triangles → geometry
 *   rhetoric (math module - 2 questions) → advanced-math (data error)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORY_MAPPINGS: Array<{
  from: { category: string; moduleType?: string };
  to: string;
  description: string;
}> = [
  // Reading & Writing remappings
  { from: { category: 'reading' }, to: 'reading-comprehension', description: 'Generic "reading" → reading-comprehension' },
  { from: { category: 'Reading Comprehension' }, to: 'reading-comprehension', description: 'Case-mismatch "Reading Comprehension" → reading-comprehension' },
  { from: { category: 'reading-writing' }, to: 'reading-comprehension', description: 'Generic "reading-writing" → reading-comprehension' },
  { from: { category: 'rhetoric', moduleType: 'reading-writing' }, to: 'writing-language', description: 'Rhetoric (R&W) → writing-language' },
  { from: { category: 'synthesis' }, to: 'writing-language', description: 'Synthesis → writing-language' },
  
  // Math remappings
  { from: { category: 'quadratic-equations' }, to: 'advanced-math', description: 'Quadratic equations → advanced-math' },
  { from: { category: 'linear-functions' }, to: 'algebra', description: 'Linear functions → algebra' },
  { from: { category: 'statistics' }, to: 'problem-solving-data-analysis', description: 'Statistics → problem-solving-data-analysis' },
  { from: { category: 'math' }, to: 'algebra', description: 'Generic "math" → algebra' },
  { from: { category: 'triangles' }, to: 'geometry', description: 'Triangles → geometry' },
  { from: { category: 'rhetoric', moduleType: 'math' }, to: 'advanced-math', description: 'Rhetoric (math module - data error) → advanced-math' },
];

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  if (dryRun) {
    console.log('🔍 DRY RUN - No changes will be made\n');
  } else {
    console.log('🔄 NORMALIZING CATEGORIES\n');
  }

  let totalUpdated = 0;

  for (const mapping of CATEGORY_MAPPINGS) {
    const where: Record<string, string> = { category: mapping.from.category };
    if (mapping.from.moduleType) {
      where.moduleType = mapping.from.moduleType;
    }

    const count = await prisma.question.count({ where });
    
    if (count === 0) {
      console.log(`  ⏭  ${mapping.description} — 0 questions (skipped)`);
      continue;
    }

    if (dryRun) {
      console.log(`  📋 ${mapping.description} — ${count} questions would be updated`);
    } else {
      const result = await prisma.question.updateMany({
        where,
        data: { category: mapping.to },
      });
      console.log(`  ✅ ${mapping.description} — ${result.count} questions updated`);
      totalUpdated += result.count;
    }
  }

  console.log(`\n${dryRun ? '📊 Total that would be updated' : '📊 Total updated'}: ${totalUpdated}`);

  // Show final distribution
  console.log('\n📊 Final Category Distribution:');
  console.log('─'.repeat(60));
  
  const cats = await prisma.question.groupBy({
    by: ['category', 'moduleType'],
    where: { isActive: true, isReserved: false },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } }
  });

  const byModule: Record<string, Array<{ category: string; count: number }>> = {};
  for (const c of cats) {
    if (!byModule[c.moduleType]) byModule[c.moduleType] = [];
    byModule[c.moduleType].push({ category: c.category, count: c._count.id });
  }

  for (const [mod, entries] of Object.entries(byModule)) {
    console.log(`\n  ${mod}:`);
    const sorted = entries.sort((a, b) => b.count - a.count);
    for (const e of sorted) {
      console.log(`    ${e.category.padEnd(35)} ${e.count}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
