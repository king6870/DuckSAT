const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'sqlserver://db-ducksat.database.windows.net:1433;initial catalog=DuckSAT_DB;user=lionvihaan;password=Microsoft757;encrypt=true;trustServerCertificate=false;loginTimeout=30'
    }
  }
});

async function main() {
  const questions = await prisma.question.findMany({
    where: {
      NOT: {
        question: { contains: 'Auto-generated' }
      }
    },
    take: 500,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      question: true,
      moduleType: true,
      category: true,
      subtopic: true,
      difficulty: true,
      tags: true,
      explanation: true,
      options: true,
    }
  });

  let html = `<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Sample Questions</title><style>body{font-family:Georgia,serif;max-width:900px;margin:40px auto;padding:0 20px;line-height:1.6;} .question{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:25px;margin-bottom:25px;} .header{background:#f0f4f8;padding:20px;border-radius:8px;margin-bottom:30px;} .meta{color:#4a5568;font-size:14px;} .badge{display:inline-block;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;} .badge.math{background:#c6f6d5;color:#22543d;} .badge.reading-writing{background:#fed7d7;color:#742a2a;} .question-text{font-size:16px;margin:15px 0;} .options{list-style:none;padding:0;} .options li{padding:10px;margin:8px 0;border-radius:4px;background:#f7fafc;} .explanation{background:#fffaf0;padding:15px;border-left:4px solid #ed8936;margin-top:15px;} .explanation-title{font-weight:bold;color:#7c2d12;margin-bottom:8px;} </style></head><body><div class='header'><h1>Sample Questions</h1><div class='meta'>Showing 100 most recent questions</div></div>`;

  questions.forEach((q, i) => {
    html += '<div class="question"><div><span class="badge ' + q.moduleType + '">' + q.moduleType + '</span> <b>' + q.category + '</b> <i>' + q.subtopic + '</i> [' + q.difficulty + ']</div><div class="question-text">' + q.question + '</div><ul class="options">';
    let opts = [];
    try { opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options; } catch { opts = q.options || []; }
    opts.forEach(function(opt, j) { html += '<li>' + opt + '</li>'; });
    html += '</ul><div class="explanation"><div class="explanation-title">Explanation:</div>' + q.explanation + '</div></div>';
  });

  html += '</body></html>';
  fs.writeFileSync('output/sample-questions.html', html);
  console.log('HTML file created: output/sample-questions.html');
}

main().catch(console.error);
