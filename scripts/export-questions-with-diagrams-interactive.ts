import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function exportQuestionsToHTML() {
  try {
    console.log('\n📤 Exporting questions with diagrams to HTML...\n');

    const questions = await prisma.question.findMany({
      where: {
        isActive: true,
        imageData: {
          not: null
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`✅ Found ${questions.length} questions with diagrams\n`);

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DuckSAT Questions with Diagrams</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .question-card {
            background: white;
            padding: 24px;
            margin-bottom: 24px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .question-number {
            color: #0066cc;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        .question-text {
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 16px;
            color: #333;
        }
        .diagram {
            margin: 20px 0;
            text-align: center;
            background: #f9f9f9;
            padding: 20px;
            border-radius: 4px;
        }
        .diagram img {
            max-width: 100%;
            height: auto;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .choices {
            margin: 20px 0;
        }
        .choice {
            padding: 12px;
            margin: 8px 0;
            border: 2px solid #e0e0e0;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .choice:hover {
            background: #f0f0f0;
        }
        .choice.correct {
            background: #e8f5e9;
            border-color: #4caf50;
            font-weight: bold;
        }
        .choice.correct::before {
            content: "✅ ";
        }
        .explanation {
            background: #fff3cd;
            padding: 16px;
            border-left: 4px solid #ffc107;
            margin: 16px 0;
            border-radius: 4px;
        }
        .explanation-title {
            font-weight: bold;
            margin-bottom: 8px;
        }
        .metadata {
            font-size: 14px;
            color: #666;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #e0e0e0;
        }
        .metadata-item {
            display: inline-block;
            margin-right: 20px;
            margin-bottom: 8px;
        }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
        }
        .badge-category { background: #e3f2fd; color: #1976d2; }
        .badge-difficulty { background: #fff3e0; color: #f57c00; }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 20px;
        }
        .stat-card {
            background: white;
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        .stat-value {
            font-size: 32px;
            font-weight: bold;
            color: #0066cc;
        }
        .stat-label {
            font-size: 14px;
            color: #666;
            margin-top: 8px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🦆 DuckSAT Questions with Diagrams</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
    </div>

    <div class="stats">
        <div class="stat-card">
            <div class="stat-value">${questions.length}</div>
            <div class="stat-label">Total Questions</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${(questions.reduce((sum, q) => sum + (q.imageData ? q.imageData.length : 0), 0) / 1024 / 1024).toFixed(2)} MB</div>
            <div class="stat-label">Total Storage</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${questions.filter(q => q.diagramAccurate !== null).length}</div>
            <div class="stat-label">Reviewed</div>
        </div>
    </div>
`;

    questions.forEach((q, index) => {
      const choices = JSON.parse(q.options);
      // Ensure imageData is properly converted to Buffer first, then to base64
      const imageBase64 = q.imageData ? Buffer.from(q.imageData).toString('base64') : '';
      const imageSrc = imageBase64 ? `data:${q.imageMimeType || 'image/png'};base64,${imageBase64}` : '';

      html += `
    <div class="question-card">
        <div class="question-number">Question ${index + 1}</div>
        <div class="question-text">${q.question}</div>
        
        ${imageSrc ? `
        <div class="diagram">
            <img src="${imageSrc}" alt="${q.imageAlt || 'Question diagram'}" />
            ${q.imageAlt ? `<p style="margin-top: 12px; color: #666; font-size: 14px;">${q.imageAlt}</p>` : ''}
        </div>
        ` : ''}
        
        <div class="choices">
`;

      choices.forEach((choice: string, i: number) => {
        const isCorrect = i === q.correctAnswer;
        html += `            <div class="choice ${isCorrect ? 'correct' : ''}">${choice}</div>\n`;
      });

      html += `        </div>
        
        <div class="explanation">
            <div class="explanation-title">💡 Explanation:</div>
            <div>${q.explanation}</div>
        </div>
        
        <div class="metadata">
            <div class="metadata-item">
                <span class="badge badge-category">${q.category}</span>
            </div>
            <div class="metadata-item">
                <span class="badge badge-difficulty">${q.difficulty}</span>
            </div>
            ${q.subtopic ? `<div class="metadata-item">📚 ${q.subtopic}</div>` : ''}
            ${q.visualType ? `<div class="metadata-item">🎨 ${q.visualType}</div>` : ''}
            ${q.source ? `<div class="metadata-item">📖 ${q.source}</div>` : ''}
            <div class="metadata-item">📅 ${new Date(q.createdAt).toLocaleDateString()}</div>
            <div class="metadata-item">💾 ${q.imageData ? (q.imageData.length / 1024).toFixed(2) : '0'} KB</div>
        </div>
    </div>
`;
    });

    html += `
</body>
</html>`;

    const outputPath = path.join(process.cwd(), 'questions-with-diagrams-interactive.html');
    fs.writeFileSync(outputPath, html, 'utf-8');

    console.log(`✅ HTML export complete!`);
    console.log(`📁 File saved: ${outputPath}`);
    console.log(`\n🌐 Open this file in your web browser to view all questions with images!\n`);

  } catch (error) {
    console.error('❌ Error exporting to HTML:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportQuestionsToHTML();
