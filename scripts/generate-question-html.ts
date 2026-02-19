/**
 * Generate HTML display for 50 practice questions
 * Reads JSON files from generated-questions/ and creates browsable HTML
 * 
 * Usage: npx tsx scripts/generate-question-html.ts
 */

import fs from 'fs';
import path from 'path';

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  category: string;
  subtopic?: string;
  difficulty: string;
  moduleType: 'math' | 'reading-writing';
}

async function generateHTML() {
  console.log('📄 Generating HTML display for 50 questions...\n');

  // Find generated question files
  const questionsDir = path.join(__dirname, '..', '..', 'azuredev-038d-main', 'generated-questions');
  
  if (!fs.existsSync(questionsDir)) {
    console.error(`❌ Directory not found: ${questionsDir}`);
    console.log('💡 Run question generation first: cd azuredev-038d-main && python sat_generator_v3.py --math 25 --reading 25');
    process.exit(1);
  }

  const files = fs.readdirSync(questionsDir)
    .filter(f => f.endsWith('.json'))
    .sort(); // Sort alphabetically

  if (files.length === 0) {
    console.error('❌ No JSON files found in generated-questions/');
    process.exit(1);
  }

  console.log(`Found ${files.length} question files`);

  // Read all questions
  const questions: Question[] = [];
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(questionsDir, file), 'utf-8');
      const question = JSON.parse(content) as Question;
      questions.push(question);
    } catch (error) {
      console.warn(`⚠️  Failed to read ${file}: ${error}`);
    }
  }

  // Separate math and reading questions
  const mathQuestions = questions.filter(q => q.moduleType === 'math');
  const readingQuestions = questions.filter(q => q.moduleType === 'reading-writing');

  console.log(`Math: ${mathQuestions.length}, Reading: ${readingQuestions.length}`);

  // Generate HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>50 SAT Practice Questions</title>
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
      <p class="subtitle">Math & Reading-Writing • Generated ${new Date().toLocaleDateString()}</p>
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

  // Write HTML file
  const outputPath = path.join(__dirname, '..', 'output', 'html', '50-questions-display.html');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html, 'utf-8');

  console.log(`\n✅ HTML file created: ${outputPath}`);
  console.log(`📊 Total questions: ${questions.length} (Math: ${mathQuestions.length}, Reading: ${readingQuestions.length})`);
  console.log(`\n💡 Open in browser: file://${outputPath.replace(/\\/g, '/')}`);
}

function renderQuestion(q: Question, num: number): string {
  const difficultyClass = q.difficulty.toLowerCase();
  
  return `
    <div class="question-card">
      <div class="question-header">
        <span class="question-number">Question ${num}</span>
        <div class="question-meta">
          <span class="badge badge-category">${q.category}</span>
          <span class="badge badge-difficulty ${difficultyClass}">${q.difficulty}</span>
        </div>
      </div>
      
      <div class="question-text">${escapeHtml(q.question)}</div>
      
      <ul class="options">
        ${q.options.map((opt, i) => `<li>${escapeHtml(opt)}</li>`).join('\n        ')}
      </ul>
      
      <div class="answer-section">
        <div class="correct-answer">✓ Correct Answer: ${q.correctAnswer}</div>
        <div class="explanation">${escapeHtml(q.explanation)}</div>
      </div>
    </div>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}

// Run
generateHTML().catch(console.error);
