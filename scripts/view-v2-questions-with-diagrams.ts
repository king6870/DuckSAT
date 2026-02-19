#!/usr/bin/env node
/**
 * View V2 Questions with Diagrams
 * 
 * Queries Azure SQL database and generates an HTML file displaying all questions with their diagrams
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const AZURE_SQL_CONNECTION = 'sqlserver://db-ducksat.database.windows.net:1433;database=DuckSAT_DB;user=lionvihaan;password=Microsoft757;encrypt=true;trustServerCertificate=false;loginTimeout=60';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:AZURE_SQL_CONNECTION
    }
  }
});

async function generateHTML() {
  try {
    console.log('\n🔍 Fetching all V2 questions with diagrams from Azure SQL...\n');

    // Fetch all V2 questions
    const questions = await prisma.question.findMany({
      where: {
        source: {
          contains: 'V2'
        }
      },
      orderBy: [
        { moduleType: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    console.log(`✅ Found ${questions.length} questions`);

    // Generate HTML
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DuckSAT V2 Questions - Full View</title>
    <style>
        body {
            font-family: Georgia, serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }
        .stat-label {
            color: #666;
            margin-top: 5px;
        }
        .question-card {
            background: white;
            padding: 30px;
            margin-bottom: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .question-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f0f0f0;
        }
        .question-number {
            font-size: 1.5em;
            font-weight: bold;
            color: #667eea;
        }
        .question-meta {
            display: flex;
            gap: 10px;
        }
        .badge {
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
        }
        .badge-math {
            background: #e3f2fd;
            color: #1976d2;
        }
        .badge-reading {
            background: #f3e5f5;
            color: #7b1fa2;
        }
        .badge-diagram {
            background: #e8f5e9;
            color: #388e3c;
        }
        .question-text {
            font-size: 1.1em;
            line-height: 1.6;
            margin: 20px 0;
            color: #333;
        }
        .passage {
            background: #f9f9f9;
            padding: 20px;
            border-left: 4px solid #667eea;
            margin: 20px 0;
            font-family: 'Times New Roman', serif;
            line-height: 1.8;
            color: #444;
        }
        .passage-title {
            font-weight: bold;
            font-size: 1.2em;
            margin-bottom: 15px;
            color: #333;
        }
        .diagram {
            margin: 20px 0;
            text-align: center;
        }
        .diagram img {
            max-width: 100%;
            height: auto;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .choices {
            margin: 20px 0;
        }
        .choice {
            padding: 12px 15px;
            margin: 8px 0;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            transition: all 0.2s;
        }
        .choice:hover {
            border-color: #667eea;
            background: #f8f9ff;
        }
        .choice.correct {
            background: #e8f5e9;
            border-color: #4caf50;
            font-weight: 600;
        }
        .explanation {
            background: #fff3e0;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
            border-left: 4px solid #ff9800;
        }
        .explanation-title {
            font-weight: bold;
            color: #e65100;
            margin-bottom: 10px;
        }
        .filter-controls {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .filter-btn {
            padding: 10px 20px;
            margin: 5px;
            border: 2px solid #667eea;
            background: white;
            color: #667eea;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
        }
        .filter-btn:hover, .filter-btn.active {
            background: #667eea;
            color: white;
        }
    </style>
    <script>
        function filterQuestions(type) {
            const buttons = document.querySelectorAll('.filter-btn');
            buttons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            
            const cards = document.querySelectorAll('.question-card');
            cards.forEach(card => {
                if (type === 'all') {
                    card.style.display = 'block';
                } else if (type === 'math' && card.dataset.type === 'math') {
                    card.style.display = 'block';
                } else if (type === 'reading' && card.dataset.type === 'reading-writing') {
                    card.style.display = 'block';
                } else if (type === 'diagrams' && card.dataset.hasDiagram === 'true') {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }
    </script>
</head>
<body>
    <div class="header">
        <h1>🦆 DuckSAT V2 Questions</h1>
        <p>Generated with Enhanced LaTeX & SAT Visual Standards</p>
    </div>

    <div class="stats">
        <div class="stat-card">
            <div class="stat-value">${questions.length}</div>
            <div class="stat-label">Total Questions</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${questions.filter(q => q.moduleType === 'math').length}</div>
            <div class="stat-label">Math Questions</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${questions.filter(q => q.moduleType === 'reading-writing').length}</div>
            <div class="stat-label">Reading Questions</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${questions.filter(q => q.imageData !== null).length}</div>
            <div class="stat-label">With Diagrams</div>
        </div>
    </div>

    <div class="filter-controls">
        <button class="filter-btn active" onclick="filterQuestions('all')">All Questions</button>
        <button class="filter-btn" onclick="filterQuestions('math')">Math Only</button>
        <button class="filter-btn" onclick="filterQuestions('reading')">Reading Only</button>
        <button class="filter-btn" onclick="filterQuestions('diagrams')">With Diagrams Only</button>
    </div>
`;

    // Add each question
    questions.forEach((q, index) => {
      const options = JSON.parse(q.options as string);
      const hasDiagram = q.imageData !== null;
      const hasPassage = q.passage !== null;

      html += `
    <div class="question-card" data-type="${q.moduleType}" data-hasDiagram="${hasDiagram}">
        <div class="question-header">
            <div class="question-number">Question #${index + 1}</div>
            <div class="question-meta">
                <span class="badge ${q.moduleType === 'math' ? 'badge-math' : 'badge-reading'}">
                    ${q.moduleType === 'math' ? '📐 Math' : '📖 Reading'}
                </span>
                ${hasDiagram ? '<span class="badge badge-diagram">📊 Has Diagram</span>' : ''}
            </div>
        </div>
`;

      // Add passage if exists
      if (hasPassage && q.passage) {
        html += `
        <div class="passage">
            <div class="passage-title">Reading Passage</div>
            ${q.passage.split('\n').map(p => `<p>${p}</p>`).join('')}
        </div>
`;
      }

      // Add diagram if exists
      if (hasDiagram && q.imageData) {
        // Ensure proper Buffer conversion for SQL Server
        let base64Image: string;
        if (Buffer.isBuffer(q.imageData)) {
          base64Image = q.imageData.toString('base64');
        } else if (typeof q.imageData === 'string') {
          base64Image = Buffer.from(q.imageData, 'binary').toString('base64');
        } else {
          base64Image = Buffer.from(q.imageData as any).toString('base64');
        }
        
        // Clean base64 for Edge compatibility: remove whitespace and line breaks
        base64Image = base64Image.replace(/\s+/g, '');
        
        html += `
        <div class="diagram">
            <img loading="lazy" src="data:image/png;base64,${base64Image}" alt="${(q.imageAlt || 'Diagram').replace(/"/g, '&quot;')}" onerror="this.onerror=null; this.src=''; this.alt='Failed to load diagram';" />
        </div>
`;
      }

      // Add question text
      html += `
        <div class="question-text">
            ${q.question}
        </div>

        <div class="choices">
`;

      // Add choices
      options.forEach((choice: string, i: number) => {
        const isCorrect = i === q.correctAnswer;
        html += `
            <div class="choice ${isCorrect ? 'correct' : ''}">
                ${choice}
            </div>
`;
      });

      html += `
        </div>

        <div class="explanation">
            <div class="explanation-title">✓ Correct Answer: ${options[q.correctAnswer]}</div>
            <div>${q.explanation}</div>
        </div>
    </div>
`;
    });

    html += `
</body>
</html>`;

    // Save HTML file
    const outputPath = path.join(process.cwd(), 'v2-questions-with-diagrams.html');
    fs.writeFileSync(outputPath, html);

    console.log(`\n✅ HTML file generated: ${outputPath}`);
    console.log(`\n🌐 Open in browser to view all questions with diagrams!\n`);

  } catch (error) {
    console.error('❌ Error generating HTML:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateHTML();
