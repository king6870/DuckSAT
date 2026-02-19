/**
 * Export 50 questions from database to HTML display
 * Fetches 25 math + 25 reading-writing questions from database
 * 
 * Usage: npx tsx scripts/export-questions-to-html.ts
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface Question {
  id: string;
  question: string;
  options: string;
  correctAnswer: string;
  explanation: string;
  category: string;
  subtopic?: string | null;
  difficulty: string;
  moduleType: string;
  imageData?: Buffer | null;
  imageUrl?: string | null;
}

async function exportToHTML() {
  console.log('📥 Fetching 50 questions from database...\n');

  try {
    // Fetch 25 math questions
    const mathQuestions = await prisma.question.findMany({
      where: {
        moduleType: 'math',
        isActive: true
      },
      select: {
        id: true,
        question: true,
        options: true,
        correctAnswer: true,
        explanation: true,
        category: true,
        subtopic: true,
        difficulty: true,
        moduleType: true,
        imageData: true,
        imageUrl: true
      },
      take: 25,
      orderBy: { createdAt: 'desc' }
    });

    // Fetch 25 reading questions
    const readingQuestions = await prisma.question.findMany({
      where: {
        moduleType: 'reading-writing',
        isActive: true
      },
      select: {
        id: true,
        question: true,
        options: true,
        correctAnswer: true,
        explanation: true,
        category: true,
        subtopic: true,
        difficulty: true,
        moduleType: true,
        imageData: true,
        imageUrl: true
      },
      take: 25,
      orderBy: { createdAt: 'desc' }
    });

    console.log(`✅ Fetched ${mathQuestions.length} math questions`);
    console.log(`✅ Fetched ${readingQuestions.length} reading questions\n`);

    // Parse options (stored as JSON string) and convert imageData to base64
    const parseQuestion = (q: any): Question => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      imageData: q.imageData ? Buffer.from(q.imageData) : null
    });

    const mathParsed = mathQuestions.map(parseQuestion);
    const readingParsed = readingQuestions.map(parseQuestion);

    // Generate HTML
    const html = generateHTML(mathParsed, readingParsed);

    // Write HTML file
    const outputPath = path.join(__dirname, '..', 'output', 'html', '50-questions-display.html');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, html, 'utf-8');

    console.log(`📄 HTML file created: ${outputPath}`);
    console.log(`📊 Total questions: ${mathParsed.length + readingParsed.length}\n`);
    console.log(`💡 Open in browser:`);
    console.log(`   file:///${outputPath.replace(/\\/g, '/')}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function generateHTML(mathQuestions: Question[], readingQuestions: Question[]): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>50 SAT Practice Questions</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"
          onload="renderMathInElement(document.body, {delimiters: [{left: '$', right: '$', display: false}, {left: '$$', right: '$$', display: true}], throwOnError: false});"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #007bff;
    }
    
    h1 {
      font-size: 2.5em;
      color: #007bff;
      margin-bottom: 10px;
    }
    
    .subtitle {
      font-size: 1.2em;
      color: #666;
    }
    
    .controls {
      text-align: center;
      margin: 30px 0;
    }
    
    button {
      background: #007bff;
      color: white;
      border: none;
      padding: 12px 30px;
      font-size: 16px;
      border-radius: 5px;
      cursor: pointer;
      transition: background 0.3s;
    }
    
    button:hover {
      background: #0056b3;
    }
    
    .section-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      margin: 40px 0 20px 0;
      border-radius: 8px;
      font-size: 1.5em;
      font-weight: bold;
    }
    
    .question-card {
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      padding: 25px;
      margin: 20px 0;
      background: #fafafa;
      transition: box-shadow 0.3s;
    }
    
    .question-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    
    .question-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    
    .question-number {
      font-size: 1.3em;
      font-weight: bold;
      color: #007bff;
    }
    
    .question-meta {
      display: flex;
      gap: 10px;
    }
    
    .badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.85em;
      font-weight: 600;
    }
    
    .badge-category {
      background: #e3f2fd;
      color: #1976d2;
    }
    
    .badge-difficulty {
      background: #fff3e0;
      color: #f57c00;
    }
    
    .badge-difficulty.easy {
      background: #e8f5e9;
      color: #388e3c;
    }
    
    .badge-difficulty.hard {
      background: #ffebee;
      color: #d32f2f;
    }
    
    .question-text {
      font-size: 1.1em;
      margin: 15px 0;
      line-height: 1.8;
      white-space: pre-wrap;
    }
    
    .question-image {
      margin: 20px 0;
      text-align: center;
      background: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .question-image img {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
    }
    
    .no-diagram {
      padding: 15px;
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 4px;
      color: #856404;
      font-style: italic;
      margin: 10px 0;
    }
    
    .options {
      list-style: none;
      margin: 20px 0;
    }
    
    .options li {
      padding: 10px 15px;
      margin: 8px 0;
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 5px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .options li:hover {
      border-color: #007bff;
      background: #f0f8ff;
    }
    
    .answer-section {
      display: none;
      margin-top: 20px;
      padding: 20px;
      background: linear-gradient(135deg, #667eea11 0%, #764ba222 100%);
      border-left: 4px solid #667eea;
      border-radius: 5px;
    }
    
    .show-answers .answer-section {
      display: block;
    }
    
    .correct-answer {
      font-size: 1.1em;
      font-weight: bold;
      color: #388e3c;
      margin-bottom: 10px;
    }
    
    .explanation {
      color: #555;
      line-height: 1.8;
      white-space: pre-wrap;
    }
    
    .toc {
      background: #f9f9f9;
      padding: 20px;
      border-radius: 8px;
      margin: 30px 0;
    }
    
    .toc h2 {
      margin-bottom: 15px;
      color: #007bff;
    }
    
    .toc a {
      color: #007bff;
      text-decoration: none;
      padding: 5px 0;
      display: inline-block;
      margin-right: 15px;
    }
    
    .toc a:hover {
      text-decoration: underline;
    }
    
    @media print {
      .controls, .toc { display: none; }
      .answer-section { display: block !important; }
      body { background: white; }
      .container { box-shadow: none; }
    }
    
    @media (max-width: 768px) {
      .container {
        padding: 20px;
      }
      
      h1 {
        font-size: 1.8em;
      }
      
      .question-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }
    }
  </style>
</head>
<body>
  <div class="container" id="questionsContainer">
    <header>
      <h1>50 SAT Practice Questions</h1>
      <p class="subtitle">Math & Reading-Writing • DuckSAT Database Export</p>
    </header>

    <div class="controls">
      <button onclick="toggleAnswers()" id="toggleBtn">Show Answers</button>
    </div>

    <div class="toc">
      <h2>Table of Contents</h2>
      <div>
        <a href="#math-section">📐 Math Section (1-${mathQuestions.length})</a>
        <a href="#reading-section">📖 Reading & Writing Section (${mathQuestions.length + 1}-${mathQuestions.length + readingQuestions.length})</a>
      </div>
    </div>

    <div class="section-header" id="math-section">
      📐 Math Section (Questions 1-${mathQuestions.length})
    </div>

    ${mathQuestions.map((q, idx) => renderQuestion(q, idx + 1)).join('\n')}

    <div class="section-header" id="reading-section">
      📖 Reading & Writing Section (Questions ${mathQuestions.length + 1}-${mathQuestions.length + readingQuestions.length})
    </div>

    ${readingQuestions.map((q, idx) => renderQuestion(q, mathQuestions.length + idx + 1)).join('\n')}
  </div>

  <script>
    function toggleAnswers() {
      const container = document.getElementById('questionsContainer');
      const btn = document.getElementById('toggleBtn');
      
      if (container.classList.contains('show-answers')) {
        container.classList.remove('show-answers');
        btn.textContent = 'Show Answers';
      } else {
        container.classList.add('show-answers');
        btn.textContent = 'Hide Answers';
      }
    }
  </script>
</body>
</html>`;
}

function renderQuestion(q: Question, num: number): string {
  const difficultyClass = q.difficulty?.toLowerCase() || 'medium';
  const options = Array.isArray(q.options) ? q.options : [];
  
  // Generate image HTML if imageData or imageUrl exists
  let imageHtml = '';
  if (q.imageData) {
    const base64 = q.imageData.toString('base64');
    imageHtml = `<div class="question-image"><img src="data:image/png;base64,${base64}" alt="Question diagram" /></div>`;
  } else if (q.imageUrl) {
    imageHtml = `<div class="question-image"><img src="${escapeHtml(q.imageUrl)}" alt="Question diagram" /></div>`;
  } else if (q.category === 'geometry' || q.subtopic?.toLowerCase().includes('graph') || q.subtopic?.toLowerCase().includes('diagram')) {
    imageHtml = `<div class="no-diagram">📊 Note: Diagram for this question is pending generation</div>`;
  }
  
  return `
    <div class="question-card">
      <div class="question-header">
        <span class="question-number">Question ${num}</span>
        <div class="question-meta">
          <span class="badge badge-category">${escapeHtml(q.category || 'general')}</span>
          <span class="badge badge-difficulty ${difficultyClass}">${escapeHtml(q.difficulty || 'medium')}</span>
        </div>
      </div>
      
      <div class="question-text">${escapeHtml(q.question)}</div>
      
      ${imageHtml}
      
      <ul class="options">
        ${options.map((opt: string) => `<li>${escapeHtml(opt)}</li>`).join('\n        ')}
      </ul>
      
      <div class="answer-section">
        <div class="correct-answer">✓ Correct Answer: ${escapeHtml(q.correctAnswer)}</div>
        <div class="explanation">${escapeHtml(q.explanation || 'No explanation available.')}</div>
      </div>
    </div>`;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

exportToHTML();
