/**
 * Export ALL questions from the database into a single interactive HTML file.
 * Includes diagrams (imageData), chart data, and all question metadata.
 * 
 * Usage:
 *   npx tsx scripts/export-generated-questions-html.ts
 *   npx tsx scripts/export-generated-questions-html.ts --source "SAT Generator QG800" --limit 55 --output public/review/latest-qg800-55.html
 * Output: all-generated-questions.html (project root)
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { normalizeLatex } from './lib/normalize-latex';

const prisma = new PrismaClient();
const DEFAULT_OUTPUT_FILE = path.join(__dirname, '..', 'all-generated-questions.html');

function getArgValue(flag: string): string | undefined {
  const args = process.argv.slice(2);
  const idx = args.indexOf(flag);
  if (idx < 0 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

interface QRow {
  id: string;
  question: string;
  passage: string | null;
  options: unknown;
  correctAnswer: number;
  explanation: string | null;
  wrongAnswerExplanations: unknown;
  moduleType: string;
  category: string;
  subtopic: string | null;
  difficulty: string;
  source: string | null;
  imageData: Buffer | null;
  imageMimeType: string | null;
  imageAlt: string | null;
  chartData: unknown;
  visualType: string | null;
}

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function normalizeForRender(value: string): string {
  let normalized = normalizeLatex(value);

  normalized = normalized
    // Fix common malformed inline math like "$K)" or "$53.5K)" -> "$K$)" / "$53.5K$)".
    .replace(/\$([A-Za-z0-9][A-Za-z0-9.+-]*)([)\],;:.])/g, (_m, token, punct) => `$${token}$${punct}`)
    .replace(/\\\$/g, '$')
    .replace(/\$\$\\([A-Za-z]+)([^$]*?)\$\$\$?/g, (_m, cmd, tail) => `$\\${cmd}${tail}$`)
    .replace(/\${3,}/g, '$$')
    .replace(/(\$[^$]+)\$\$(?=[^$]|$)/g, '$1$')
    .replace(/\\\\([A-Za-z]+)/g, '\\$1');

  return normalized;
}

function formatText(value: string | null | undefined): string {
  if (!value) return '';
  return esc(normalizeForRender(value)).replace(/\r?\n/g, '<br>');
}

async function main() {
  const sourceFilter = getArgValue('--source');
  const limit = parsePositiveInt(getArgValue('--limit'));
  const outputArg = getArgValue('--output');
  const outputFile = outputArg ? path.resolve(process.cwd(), outputArg) : DEFAULT_OUTPUT_FILE;

  console.log('📤 Querying all questions from database...');
  if (sourceFilter) {
    console.log(`   Filter source: ${sourceFilter}`);
  }
  if (limit) {
    console.log(`   Limit: ${limit}`);
  }

  const whereClause = sourceFilter
    ? { isActive: true, source: sourceFilter }
    : { isActive: true };

  const orderByClause = limit
    ? [{ createdAt: 'desc' as const }]
    : [{ category: 'asc' as const }, { difficulty: 'asc' as const }];

  const rows = await prisma.question.findMany({
    where: whereClause,
    orderBy: orderByClause,
    take: limit,
    select: {
      id: true, question: true, passage: true, options: true,
      correctAnswer: true, explanation: true, wrongAnswerExplanations: true,
      moduleType: true, category: true, subtopic: true, difficulty: true,
      source: true, imageData: true, imageMimeType: true, imageAlt: true,
      chartData: true, visualType: true,
    },
  }) as QRow[];
  
  console.log(`✅ Found ${rows.length} questions`);

  const allQ = rows;

  // Group by category
  const byCategory: Record<string, QRow[]> = {};
  for (const q of allQ) {
    const cat = q.category || 'unknown';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(q);
  }

  const rwCats = Object.keys(byCategory).filter(c => byCategory[c][0]?.moduleType === 'reading-writing').sort();
  const mathCats = Object.keys(byCategory).filter(c => byCategory[c][0]?.moduleType === 'math').sort();
  const sortedCats = [...rwCats, ...mathCats];

  const diff = { easy: 0, medium: 0, hard: 0 };
  for (const q of allQ) if (q.difficulty in diff) diff[q.difficulty as keyof typeof diff]++;
  const mathN = allQ.filter(q => q.moduleType === 'math').length;
  const rwN = allQ.filter(q => q.moduleType === 'reading-writing').length;
  const diagramN = allQ.filter(q => q.imageData || q.chartData).length;

  // Parse options from DB JSON
  function getOptions(q: QRow): string[] {
    if (Array.isArray(q.options)) return q.options as string[];
    if (typeof q.options === 'string') {
      try { return JSON.parse(q.options); } catch { return []; }
    }
    return [];
  }

  // Parse wrongAnswerExplanations from DB
  function getWrongExpl(q: QRow): Record<string, string> | null {
    if (!q.wrongAnswerExplanations) return null;
    if (typeof q.wrongAnswerExplanations === 'object' && !Array.isArray(q.wrongAnswerExplanations)) {
      return q.wrongAnswerExplanations as Record<string, string>;
    }
    if (typeof q.wrongAnswerExplanations === 'string') {
      try { return JSON.parse(q.wrongAnswerExplanations); } catch { return null; }
    }
    return null;
  }

  // Get base64 image data URI
  function getImageDataUri(q: QRow): string | null {
    if (!q.imageData) return null;
    const mime = q.imageMimeType || 'image/png';
    const b64 = Buffer.isBuffer(q.imageData) 
      ? q.imageData.toString('base64') 
      : String(q.imageData);
    return `data:${mime};base64,${b64}`;
  }

  // Build question cards HTML
  function buildCards(cat: string): string {
    return byCategory[cat].map((q, i) => {
      const options = getOptions(q);
      const opts = options.map((o, oi) =>
        `<li class="${oi === q.correctAnswer ? 'correct' : ''}">${formatText(String(o))}${oi === q.correctAnswer ? ' ✓' : ''}</li>`
      ).join('\n');

      const we = getWrongExpl(q);
      const wrongHtml = we
        ? Object.entries(we)
            .filter(([, v]) => v?.trim())
            .map(([k, v]) => `<div class="wrong-expl"><strong>${esc(k)})</strong> ${formatText(v)}</div>`)
            .join('\n')
        : '';

      const imgUri = getImageDataUri(q);
      const imgHtml = imgUri
        ? `<div class="diagram"><img src="${imgUri}" alt="${esc(q.imageAlt || 'Diagram')}" loading="lazy"><div class="img-caption">${esc(q.imageAlt || '')}</div></div>`
        : '';

      const chartJson = q.chartData ? (typeof q.chartData === 'string' ? q.chartData : JSON.stringify(q.chartData)) : null;
      const chartHtml = chartJson
        ? `<div class="chart-data"><details><summary>📊 Chart Data</summary><pre>${esc(chartJson)}</pre></details></div>`
        : '';

      const hasDiagram = imgUri || chartJson;

      return `<div class="q-card ${q.difficulty}${hasDiagram ? ' has-diagram' : ''}" data-diff="${q.difficulty}" data-cat="${esc(cat)}" data-mod="${esc(q.moduleType)}" data-hasdiagram="${hasDiagram ? '1' : '0'}">
  <div class="q-meta">
    <span class="q-num">#${i + 1}</span>
    <span class="pill diff-${q.difficulty}">${q.difficulty}</span>
    ${q.subtopic ? `<span class="pill subtopic">${esc(q.subtopic)}</span>` : ''}
    ${q.visualType && q.visualType !== 'none' ? `<span class="pill visual">${esc(q.visualType)}</span>` : ''}
    ${hasDiagram ? '<span class="pill diagram-pill">📐 Diagram</span>' : ''}
    ${q.source ? `<span class="pill batch">${esc(q.source)}</span>` : ''}
  </div>
  ${q.passage ? `<div class="passage">${formatText(q.passage)}</div>` : ''}
  ${imgHtml}
  ${chartHtml}
  <div class="q-text">${formatText(q.question)}</div>
  <ul class="options">${opts}</ul>
  <button class="explain-toggle" onclick="toggleExpl(this)">Show Explanation</button>
  <div class="explanation">
    <strong>Explanation:</strong> ${formatText(q.explanation || 'No explanation available.')}
    ${wrongHtml}
  </div>
</div>`;
    }).join('\n');
  }

  const sectionsHtml = sortedCats.map(cat => {
    const qs = byCategory[cat];
    const mod = qs[0]?.moduleType || 'math';
    const mc = mod === 'math' ? 'math' : 'rw';
    return `<div class="cat-section" data-module="${esc(mod)}" data-category="${esc(cat)}">
  <div class="cat-header" onclick="toggleCat(this)">
    <div><h2>${esc(cat)}</h2></div>
    <div style="display:flex;align-items:center;gap:12px">
      <span class="badge ${mc}">${esc(mod)}</span>
      <span class="cat-count">${qs.length} questions</span>
      <span class="toggle">&#9654;</span>
    </div>
  </div>
  <div class="q-list">
${buildCards(cat)}
  </div>
</div>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DuckSAT - All Questions (${allQ.length})</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" crossorigin="anonymous">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js" crossorigin="anonymous"><\/script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" crossorigin="anonymous"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f0f2f5;color:#1a1a2e;line-height:1.6}
.top-bar{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:24px 32px;position:sticky;top:0;z-index:100;box-shadow:0 4px 20px rgba(0,0,0,.25)}
.top-bar h1{font-size:1.8em;margin-bottom:4px}
.top-bar .sub{opacity:.85;font-size:.95em}
.container{max-width:1100px;margin:0 auto;padding:24px 16px}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:28px}
.stat{background:#fff;border-radius:12px;padding:18px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.stat .num{font-size:2em;font-weight:800;display:block}
.stat .lbl{font-size:.82em;color:#666;text-transform:uppercase;letter-spacing:.5px}
.stat.math .num{color:#3b82f6}.stat.rw .num{color:#a855f7}
.stat.easy .num{color:#22c55e}.stat.med .num{color:#f59e0b}.stat.hard .num{color:#ef4444}.stat.total .num{color:#667eea}.stat.diag .num{color:#f97316}
.filters{background:#fff;border-radius:12px;padding:20px;margin-bottom:24px;box-shadow:0 2px 8px rgba(0,0,0,.06);display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.filters label{font-weight:600;font-size:.9em;color:#444}
.filters select,.filters input{padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:.9em;background:#f9f9f9}
.filters input[type=text]{width:260px}
.filters .count-badge{margin-left:auto;background:#667eea;color:#fff;padding:6px 16px;border-radius:20px;font-weight:700;font-size:.95em}
.cat-section{margin-bottom:32px}
.cat-header{background:#fff;border-radius:12px;padding:16px 20px;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none}
.cat-header:hover{background:#f8f8ff}
.cat-header h2{font-size:1.2em;color:#333}
.cat-header .badge{padding:4px 14px;border-radius:20px;font-size:.85em;font-weight:700;color:#fff}
.cat-header .badge.math{background:#3b82f6}.cat-header .badge.rw{background:#a855f7}
.cat-header .cat-count{color:#888;font-size:.9em}
.cat-header .toggle{font-size:1.4em;color:#999;transition:transform .2s}
.cat-header.open .toggle{transform:rotate(90deg)}
.q-list{display:none}.q-list.open{display:block}
.q-card{background:#fff;border-radius:12px;padding:20px 24px;margin-bottom:10px;box-shadow:0 1px 4px rgba(0,0,0,.05);border-left:4px solid #ddd;transition:border-color .2s}
.q-card.easy{border-left-color:#22c55e}.q-card.medium{border-left-color:#f59e0b}.q-card.hard{border-left-color:#ef4444}
.q-card.has-diagram{border-left-color:#f97316;border-left-width:6px}
.q-card .q-meta{display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;align-items:center}
.q-card .q-meta .pill{padding:2px 10px;border-radius:12px;font-size:.75em;font-weight:600}
.pill.diff-easy{background:#dcfce7;color:#166534}.pill.diff-medium{background:#fef9c3;color:#854d0e}.pill.diff-hard{background:#fee2e2;color:#991b1b}
.pill.subtopic{background:#e0e7ff;color:#3730a3}.pill.batch{background:#f3f4f6;color:#6b7280;font-size:.7em}
.pill.visual{background:#fef3c7;color:#92400e}.pill.diagram-pill{background:#fff7ed;color:#c2410c;border:1px solid #fdba74}
.q-card .q-num{font-weight:700;color:#667eea;font-size:.85em}
.q-card .passage{background:#f8f9fb;border-left:3px solid #c7d2fe;padding:12px 16px;margin:10px 0;border-radius:6px;font-size:.92em;color:#444;white-space:pre-wrap}
.q-card .q-text{font-size:1em;margin-bottom:12px;font-weight:500}
.q-card .options{list-style:none;padding:0;margin-bottom:12px}
.q-card .options li{padding:6px 12px;margin:4px 0;border-radius:8px;font-size:.93em;background:#f9f9f9}
.q-card .options li.correct{background:#dcfce7;font-weight:600;border:1px solid #86efac}
.q-card .explanation{background:#eff6ff;border-radius:8px;padding:12px 16px;font-size:.88em;color:#1e40af;margin-top:8px;display:none}
.q-card .explanation.show{display:block}
.q-card .wrong-expl{margin-top:6px;font-size:.85em;color:#6b7280}
.q-card .wrong-expl strong{color:#444}
.q-card .explain-toggle{background:none;border:1px solid #c7d2fe;color:#667eea;padding:4px 14px;border-radius:8px;cursor:pointer;font-size:.82em;font-weight:600}
.q-card .explain-toggle:hover{background:#eff6ff}
.diagram{margin:12px 0;text-align:center}
.diagram img{max-width:100%;max-height:500px;border-radius:10px;border:1px solid #e5e7eb;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.diagram .img-caption{font-size:.8em;color:#6b7280;margin-top:6px;font-style:italic}
.chart-data{margin:8px 0}
.chart-data summary{cursor:pointer;color:#6b7280;font-size:.85em}
.chart-data pre{background:#f9fafb;padding:12px;border-radius:8px;font-size:.78em;overflow-x:auto;max-height:200px}
@media(max-width:700px){.top-bar{padding:16px}.top-bar h1{font-size:1.3em}.filters{flex-direction:column}.filters input[type=text]{width:100%}.filters .count-badge{margin-left:0}}
</style>
</head>
<body>
<div class="top-bar">
  <h1>&#129414; DuckSAT - All Questions</h1>
  <div class="sub">${allQ.length} questions from the database &bull; ${diagramN} with diagrams &bull; Exported ${new Date().toLocaleDateString()}</div>
</div>
<div class="container">
<div class="stats-grid">
  <div class="stat total"><span class="num">${allQ.length}</span><span class="lbl">Total</span></div>
  <div class="stat math"><span class="num">${mathN}</span><span class="lbl">Math</span></div>
  <div class="stat rw"><span class="num">${rwN}</span><span class="lbl">Reading & Writing</span></div>
  <div class="stat easy"><span class="num">${diff.easy}</span><span class="lbl">Easy</span></div>
  <div class="stat med"><span class="num">${diff.medium}</span><span class="lbl">Medium</span></div>
  <div class="stat hard"><span class="num">${diff.hard}</span><span class="lbl">Hard</span></div>
  <div class="stat diag"><span class="num">${diagramN}</span><span class="lbl">Diagrams</span></div>
</div>
<div class="filters">
  <label>Module:</label>
  <select id="fMod"><option value="">All</option><option value="math">Math</option><option value="reading-writing">Reading & Writing</option></select>
  <label>Category:</label>
  <select id="fCat"><option value="">All</option>${sortedCats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select>
  <label>Difficulty:</label>
  <select id="fDiff"><option value="">All</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select>
  <label>Diagrams:</label>
  <select id="fDiag"><option value="">All</option><option value="1">With Diagram</option><option value="0">No Diagram</option></select>
  <label>Search:</label>
  <input type="text" id="fSearch" placeholder="Search question text...">
  <span class="count-badge" id="vis">${allQ.length} shown</span>
</div>
<div id="questions">
${sectionsHtml}
</div>
</div>
<script>
function toggleCat(el){el.classList.toggle('open');el.nextElementSibling.classList.toggle('open')}
function toggleExpl(btn){var e=btn.nextElementSibling;e.classList.toggle('show');btn.textContent=e.classList.contains('show')?'Hide Explanation':'Show Explanation'}
var fMod=document.getElementById('fMod'),fCat=document.getElementById('fCat'),fDiff=document.getElementById('fDiff'),fSearch=document.getElementById('fSearch'),fDiag=document.getElementById('fDiag'),vis=document.getElementById('vis');
function filter(){var m=fMod.value,c=fCat.value,d=fDiff.value,s=fSearch.value.toLowerCase(),dg=fDiag.value,n=0;
document.querySelectorAll('.cat-section').forEach(function(sec){
  if(m&&sec.dataset.module!==m){sec.style.display='none';return}
  if(c&&sec.dataset.category!==c){sec.style.display='none';return}
  sec.style.display='';var cn=0;
  sec.querySelectorAll('.q-card').forEach(function(card){
    var v=true;if(d&&card.dataset.diff!==d)v=false;
    if(dg&&card.dataset.hasdiagram!==dg)v=false;
    if(s&&card.textContent.toLowerCase().indexOf(s)<0)v=false;
    card.style.display=v?'':'none';if(v)cn++});
  n+=cn;var ce=sec.querySelector('.cat-count');if(ce)ce.textContent=cn+' questions';
  if(cn===0&&(d||s||dg))sec.style.display='none'});
vis.textContent=n+' shown'}
fMod.onchange=filter;fCat.onchange=filter;fDiff.onchange=filter;fSearch.oninput=filter;fDiag.onchange=filter;
document.addEventListener("DOMContentLoaded",function(){if(typeof renderMathInElement==='function'){renderMathInElement(document.body,{delimiters:[{left:"$$",right:"$$",display:true},{left:"$",right:"$",display:false}],throwOnError:false})}});
<\/script>
</body>
</html>`;

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, html, 'utf-8');
  console.log(`✅ Exported ${allQ.length} questions (${diagramN} with diagrams)`);
  console.log(`   File: ${outputFile}`);
  console.log(`\n📊 By Category:`);
  for (const cat of sortedCats) {
    const diagInCat = byCategory[cat].filter(q => q.imageData || q.chartData).length;
    const diagLabel = diagInCat > 0 ? ` (${diagInCat} diagrams)` : '';
    console.log(`   ${cat.padEnd(35)} ${byCategory[cat].length}${diagLabel}`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
