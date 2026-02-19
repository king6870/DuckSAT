#!/usr/bin/env node
/**
 * Export V2 Questions with Diagrams as PNG Files
 * 
 * This creates an images folder with all diagrams as separate PNG files
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const AZURE_SQL_CONNECTION = 'sqlserver://db-ducksat.database.windows.net:1433;database=DuckSAT_DB;user=lionvihaan;password=Microsoft757;encrypt=true;trustServerCertificate=false;loginTimeout=60';

const prisma = new PrismaClient({
  datasources: { db: { url: AZURE_SQL_CONNECTION } }
});

async function exportDiagrams() {
  try {
    console.log('\n🔍 Fetching questions with diagrams from Azure SQL...\n');

    const questions = await prisma.question.findMany({
      where: {
        source: { contains: 'V2' },
        imageData: { not: null }
      },
      orderBy: [
        { moduleType: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    console.log(`✅ Found ${questions.length} questions with diagrams`);

    // Create output directory
    const outputDir = path.join(process.cwd(), 'v2-diagrams');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Export each diagram
    let exportCount = 0;
    questions.forEach((q, index) => {
      if (q.imageData) {
        const filename = `diagram_${index + 1}.png`;
        const filepath = path.join(outputDir, filename);
        
        // Write image buffer to file
        fs.writeFileSync(filepath, q.imageData);
        exportCount++;
        
        console.log(`  ✅ Exported: ${filename}`);
      }
    });

    // Create HTML with file references
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DuckSAT V2 Questions - With Diagram Files</title>
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
        .badge {
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
            background: #e3f2fd;
            color: #1976d2;
        }
        .question-text {
            font-size: 1.1em;
            line-height: 1.6;
            margin: 20px 0;
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
    </style>
</head>
<body>
    <div class="header">
        <h1>🦆 DuckSAT V2 Questions</h1>
        <p>With Exported Diagram Files</p>
    </div>
`;

    // Add each question
    questions.forEach((q, index) => {
      const options = JSON.parse(q.options as string);
      
      html += `
    <div class="question-card">
        <div class="question-header">
            <div class="question-number">Question #${index + 1}</div>
            <span class="badge">📐 Math</span>
        </div>
        
        <div class="diagram">
            <img src="v2-diagrams/diagram_${index + 1}.png" alt="${q.imageAlt || 'Diagram'}" />
        </div>
        
        <div class="question-text">
            ${q.question}
        </div>

        <div class="choices">
`;

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
    const htmlPath = path.join(process.cwd(), 'v2-questions-with-diagram-files.html');
    fs.writeFileSync(htmlPath, html);

    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log(`✅ Export Complete!`);
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(` Diagrams exported: ${exportCount}`);
    console.log(` Output folder:     ${outputDir}`);
    console.log(` HTML file:         ${htmlPath}`);
    console.log(`═══════════════════════════════════════════════════════════\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportDiagrams();
