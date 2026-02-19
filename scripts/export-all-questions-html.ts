import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function exportAllQuestionsToHTML() {
  try {
    console.log('\n📤 Exporting all questions to HTML...\n');

    // Fetch all questions
    const questions = await prisma.question.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    console.log(`✅ Found ${questions.length} questions\n`);

    const mathQuestions = questions.filter(q => q.category === 'math');
    const readingQuestions = questions.filter(q => q.category === 'reading');
    const withDiagrams = questions.filter(q => q.imageData);

    // Generate HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DuckSAT - All Questions (${questions.length})</title>
    
    <!-- KaTeX for LaTeX rendering -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" integrity="sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV" crossorigin="anonymous">
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js" integrity="sha384-XjKyOOlGwcjNTAIQHIpgOno0Hl1YQqzUOEleOLALmuqehneUG+vnGctmUb0ZY0l8" crossorigin="anonymous"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" integrity="sha384-+VBxd3r6XgURycqtZ117nYw44OOcIax56Z4dCRWbxyPt0Koah1uHoK0o4+/RRE05" crossorigin="anonymous"></script>
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-bottom: 30px;
            text-align: center;
        }
        .header h1 {
            color: #667eea;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        .stat-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        .stat-box .number {
            font-size: 2em;
            font-weight: bold;
            display: block;
        }
        .stat-box .label {
            font-size: 0.9em;
            opacity: 0.9;
        }
        .filters {
            background: white;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-bottom: 20px;
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            align-items: center;
        }
        .filters label {
            font-weight: 600;
            color: #667eea;
        }
        .filters select, .filters input {
            padding: 10px;
            border: 2px solid #667eea;
            border-radius: 8px;
            font-size: 1em;
            outline: none;
            transition: all 0.3s;
        }
        .filters select:focus, .filters input:focus {
            border-color: #764ba2;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        .question-card {
            background: white;
            padding: 25px;
            margin-bottom: 20px;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            transition: transform 0.3s, box-shadow 0.3s;
        }
        .question-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .question-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            flex-wrap: wrap;
            gap: 10px;
        }
        .question-id {
            font-weight: bold;
            color: #667eea;
            font-size: 1.1em;
        }
        .badges {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        .badge {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
            text-transform: uppercase;
        }
        .badge.math { background: #e3f2fd; color: #1976d2; }
        .badge.reading { background: #f3e5f5; color: #7b1fa2; }
        .badge.diagram { background: #fff3e0; color: #e65100; }
        .badge.easy { background: #c8e6c9; color: #388e3c; }
        .badge.medium { background: #fff9c4; color: #f57c00; }
        .badge.hard { background: #ffcdd2; color: #c62828; }
        .question-text {
            font-size: 1.1em;
            color: #333;
            margin: 15px 0;
            line-height: 1.8;
        }
        .diagram {
            margin: 20px 0;
            text-align: center;
        }
        .diagram img {
            max-width: 100%;
            height: auto;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .choices {
            margin: 20px 0;
        }
        .choice {
            padding: 12px 15px;
            margin: 8px 0;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .choice:hover {
            border-color: #667eea;
            background: #f8f9ff;
        }
        .choice.correct {
            background: #c8e6c9;
            border-color: #388e3c;
        }
        .choice-label {
            font-weight: bold;
            color: #667eea;
            margin-right: 10px;
        }
        .explanation {
            background: #fff9c4;
            padding: 15px;
            border-left: 4px solid #f57c00;
            border-radius: 8px;
            margin-top: 15px;
        }
        .explanation strong {
            color: #e65100;
            display: block;
            margin-bottom: 8px;
        }
        .no-results {
            text-align: center;
            padding: 40px;
            color: white;
            font-size: 1.2em;
        }
        .loading {
            text-align: center;
            padding: 40px;
            font-size: 1.2em;
            color: white;
        }
        @media (max-width: 768px) {
            .header h1 {
                font-size: 1.8em;
            }
            .stats {
                grid-template-columns: 1fr;
            }
            .filters {
                flex-direction: column;
                align-items: stretch;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🦆 DuckSAT Question Bank</h1>
            <p style="color: #666; font-size: 1.1em;">Complete Collection of Practice Questions</p>
            <div class="stats">
                <div class="stat-box">
                    <span class="number">${questions.length}</span>
                    <span class="label">Total Questions</span>
                </div>
                <div class="stat-box">
                    <span class="number">${mathQuestions.length}</span>
                    <span class="label">Math Questions</span>
                </div>
                <div class="stat-box">
                    <span class="number">${readingQuestions.length}</span>
                    <span class="label">Reading Questions</span>
                </div>
                <div class="stat-box">
                    <span class="number">${withDiagrams.length}</span>
                    <span class="label">With Diagrams</span>
                </div>
            </div>
        </div>

        <div class="filters">
            <label for="categoryFilter">Category:</label>
            <select id="categoryFilter">
                <option value="all">All</option>
                <option value="math">Math</option>
                <option value="reading">Reading</option>
            </select>

            <label for="diagramFilter">Diagrams:</label>
            <select id="diagramFilter">
                <option value="all">All</option>
                <option value="with">With Diagrams</option>
                <option value="without">Without Diagrams</option>
            </select>

            <label for="difficultyFilter">Difficulty:</label>
            <select id="difficultyFilter">
                <option value="all">All</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
            </select>

            <label for="searchBox">Search:</label>
            <input type="text" id="searchBox" placeholder="Search questions...">
        </div>

        <div id="questionsContainer"></div>
    </div>

    <script>
        const questions = ${JSON.stringify(questions.map(q => ({
          id: q.id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          imageData: q.imageData ? Buffer.from(q.imageData).toString('base64') : null,
          category: q.category,
          difficulty: q.difficulty,
          visualType: q.visualType,
          subtopic: q.subtopic
        })))};

        function renderQuestions(filteredQuestions) {
            const container = document.getElementById('questionsContainer');
            
            if (filteredQuestions.length === 0) {
                container.innerHTML = '<div class="no-results">No questions match your filters</div>';
                return;
            }

            container.innerHTML = filteredQuestions.map(q => {
                const choices = JSON.parse(q.options);
                const letters = ['A', 'B', 'C', 'D'];
                
                let choicesHTML = choices.map((choice, idx) => 
                    \`<div class="choice \${idx === q.correctAnswer ? 'correct' : ''}">
                        <span class="choice-label">\${letters[idx]}.</span> \${choice}
                    </div>\`
                ).join('');

                let diagramHTML = '';
                if (q.imageData) {
                    diagramHTML = \`<div class="diagram">
                        <img src="data:image/png;base64,\${q.imageData}" alt="Diagram">
                    </div>\`;
                }

                return \`<div class="question-card" data-category="\${q.category}" data-difficulty="\${q.difficulty}" data-diagram="\${q.imageData ? 'with' : 'without'}">
                    <div class="question-header">
                        <span class="question-id">Question #\${q.id}</span>
                        <div class="badges">
                            <span class="badge \${q.category}">\${q.category}</span>
                            <span class="badge \${q.difficulty}">\${q.difficulty}</span>
                            \${q.imageData ? '<span class="badge diagram">📊 Diagram</span>' : ''}
                            \${q.subtopic ? \`<span class="badge" style="background: #e0e0e0; color: #666;">\${q.subtopic}</span>\` : ''}
                        </div>
                    </div>
                    <div class="question-text">\${q.question}</div>
                    \${diagramHTML}
                    <div class="choices">\${choicesHTML}</div>
                    <div class="explanation">
                        <strong>📝 Explanation:</strong>
                        \${q.explanation}
                    </div>
                </div>\`;
            }).join('');
        }

        function applyFilters() {
            const category = document.getElementById('categoryFilter').value;
            const diagram = document.getElementById('diagramFilter').value;
            const difficulty = document.getElementById('difficultyFilter').value;
            const search = document.getElementById('searchBox').value.toLowerCase();

            const filtered = questions.filter(q => {
                if (category !== 'all' && q.category !== category) return false;
                if (diagram === 'with' && !q.imageData) return false;
                if (diagram === 'without' && q.imageData) return false;
                if (difficulty !== 'all' && q.difficulty !== difficulty) return false;
                if (search && !q.question.toLowerCase().includes(search)) return false;
                return true;
            });

            renderQuestions(filtered);
            renderMath(); // Re-render math after DOM update
        }

        function renderMath() {
            // Simple auto-render with KaTeX - database already has $ delimiters
            if (window.renderMathInElement) {
                try {
                    renderMathInElement(document.body, {
                        delimiters: [
                            {left: '$$', right: '$$', display: true},
                            {left: '$', right: '$', display: false}
                        ],
                        throwOnError: false,
                        errorColor: '#cc0000',
                        strict: false,
                        trust: false
                    });
                } catch (e) {
                    console.error('KaTeX error:', e);
                }
            }
        }

        // Initial render
        renderQuestions(questions);

        // Add event listeners
        document.getElementById('categoryFilter').addEventListener('change', applyFilters);
        document.getElementById('diagramFilter').addEventListener('change', applyFilters);
        document.getElementById('difficultyFilter').addEventListener('change', applyFilters);
        document.getElementById('searchBox').addEventListener('input', applyFilters);

        // Render math when KaTeX loads
        window.addEventListener('load', function() {
            setTimeout(renderMath, 50);
        });
    </script>
</body>
</html>`;

    // Save HTML file
    const outputPath = path.join(process.cwd(), 'all-questions.html');
    fs.writeFileSync(outputPath, html);

    console.log(`✅ HTML export complete!`);
    console.log(`📁 File saved: ${outputPath}`);
    console.log(`🌐 Open this file in your web browser to view all ${questions.length} questions!`);
    console.log(`\n📊 Summary:`);
    console.log(`   Total: ${questions.length}`);
    console.log(`   Math: ${mathQuestions.length}`);
    console.log(`   Reading: ${readingQuestions.length}`);
    console.log(`   With diagrams: ${withDiagrams.length}`);

  } catch (error: any) {
    console.error('\n❌ Error exporting to HTML:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

exportAllQuestionsToHTML();
