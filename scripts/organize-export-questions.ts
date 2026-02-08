#!/usr/bin/env node
/**
 * Organize Export Questions Script
 * 
 * Converts flat export folder structure into organized question folders.
 * Each question gets its own folder with standardized file names.
 * 
 * Input:  azuredev-038d-main/azuredev-038d-main/export/ (flat files)
 * Output: organized-questions/ (structured folders)
 * 
 * Usage:
 *   npx tsx scripts/organize-export-questions.ts
 *   npm run questions:organize
 */

import * as fs from 'fs';
import * as path from 'path';

// Configuration
const EXPORT_DIR = path.join(process.cwd(), 'azuredev-038d-main', 'azuredev-038d-main', 'export');
const OUTPUT_DIR = path.join(process.cwd(), 'organized-questions');

interface QuestionData {
  timestamp: string;
  question: string;
  choices: string[];
  diagram_description?: string;
  correct_answer: string;
  answer_value: string;
  explanation: string;
}

interface ValidationData {
  overall_status?: string;
  geometrically_valid?: boolean;
  question_diagram_match?: boolean;
  solvable?: boolean;
  terminology_correct?: boolean;
  warnings?: string;
}

interface VerificationData {
  quality_score?: number;
  answer_correct?: boolean;
  recommendation?: string;
}

interface EnhancedMetadata {
  id: string;
  timestamp: string;
  question: string;
  choices: string[];
  correctAnswer: string;
  correctAnswerIndex: number;
  answerValue: string;
  explanation: string;
  diagramDescription?: string;
  hasDiagram: boolean;
  moduleType: string;
  category: string;
  subtopic?: string;
  difficulty: string;
  timeEstimate: number;
  source: string;
  tags: string[];
  validation?: {
    status?: string;
    geometricallyValid?: boolean;
    questionDiagramMatch?: boolean;
    solvable?: boolean;
    terminologyCorrect?: boolean;
    warnings?: string;
  };
  verification?: {
    qualityScore?: number;
    answerCorrect?: boolean;
    recommendation?: string;
  };
}

// Helper: Detect module type from question content
function detectModuleType(question: string, choices: string[]): string {
  const mathKeywords = [
    'solve', 'calculate', 'equation', 'function', 'triangle', 'circle',
    'area', 'perimeter', 'volume', 'graph', 'coordinate', 'angle',
    'polynomial', 'derivative', 'integral', 'matrix', 'vector',
    'probability', 'statistics', 'mean', 'median', 'standard deviation',
    'slope', 'intercept', 'parabola', 'quadratic', 'linear',
    'geometry', 'algebra', 'trigonometry', 'sqrt', 'root'
  ];
  
  const text = (question + ' ' + choices.join(' ')).toLowerCase();
  
  for (const keyword of mathKeywords) {
    if (text.includes(keyword)) {
      return 'math';
    }
  }
  
  return 'reading-writing';
}

// Helper: Detect category from question content
function detectCategory(question: string, moduleType: string): string {
  const text = question.toLowerCase();
  
  if (moduleType === 'math') {
    // Geometry keywords
    const geometryKeywords = ['triangle', 'circle', 'angle', 'perpendicular', 
                              'parallel', 'polygon', 'area', 'perimeter', 
                              'volume', 'surface', 'coordinate', 'distance'];
    
    // Algebra keywords
    const algebraKeywords = ['equation', 'solve', 'variable', 'expression', 
                             'linear', 'quadratic', 'polynomial', 'factor'];
    
    // Data analysis keywords
    const dataKeywords = ['mean', 'median', 'mode', 'average', 'statistics', 
                          'probability', 'data', 'graph', 'chart', 'table'];
    
    for (const keyword of geometryKeywords) {
      if (text.includes(keyword)) return 'geometry';
    }
    
    for (const keyword of algebraKeywords) {
      if (text.includes(keyword)) return 'algebra';
    }
    
    for (const keyword of dataKeywords) {
      if (text.includes(keyword)) return 'data-analysis';
    }
    
    return 'advanced-math';
  } else {
    return 'reading-comprehension';
  }
}

// Helper: Detect subtopic from question content
function detectSubtopic(question: string, category: string): string | undefined {
  const text = question.toLowerCase();
  
  if (category === 'geometry') {
    if (text.includes('triangle')) return 'triangles';
    if (text.includes('circle')) return 'circles';
    if (text.includes('angle')) return 'angles';
    if (text.includes('area') || text.includes('perimeter')) return 'area-perimeter';
  } else if (category === 'algebra') {
    if (text.includes('linear')) return 'linear-equations';
    if (text.includes('quadratic')) return 'quadratic-functions';
  }
  
  return undefined;
}

// Helper: Generate tags from question content
function generateTags(question: string, category: string, moduleType: string): string[] {
  const tags: string[] = [moduleType, category];
  const text = question.toLowerCase();
  
  // Add specific concept tags
  if (text.includes('right triangle')) tags.push('right-triangle');
  if (text.includes('altitude') || text.includes('perpendicular')) tags.push('altitude');
  if (text.includes('pythagorean')) tags.push('pythagorean-theorem');
  if (text.includes('area')) tags.push('area');
  if (text.includes('solve')) tags.push('problem-solving');
  
  tags.push('AI-generated');
  
  return tags;
}

// Helper: Convert answer letter to index (A=0, B=1, C=2, D=3)
function answerToIndex(answer: string): number {
  const match = answer.match(/^([A-D])/i);
  if (!match) return 0;
  return match[1].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
}

// Helper: Read JSON file safely
function readJSON(filePath: string): any | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`  ❌ Error reading JSON file ${filePath}:`, error);
    return null;
  }
}

// Helper: Copy file if exists
function copyFileIfExists(source: string, destination: string): boolean {
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, destination);
    return true;
  }
  return false;
}

// Main function to organize questions
async function organizeQuestions() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Question Organization Script                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Check if export directory exists
  if (!fs.existsSync(EXPORT_DIR)) {
    console.error(`❌ Export directory not found: ${EXPORT_DIR}`);
    console.log('Please ensure the export folder exists and contains question files.');
    process.exit(1);
  }
  
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✅ Created output directory: ${OUTPUT_DIR}\n`);
  }
  
  // Find all question JSON files
  const files = fs.readdirSync(EXPORT_DIR);
  const questionFiles = files.filter(f => f.startsWith('sat_question_') && f.endsWith('.json'));
  
  console.log(`📂 Found ${questionFiles.length} question files in export folder\n`);
  
  let successCount = 0;
  let errorCount = 0;
  const skippedFiles: string[] = [];
  
  // Process each question
  for (let i = 0; i < questionFiles.length; i++) {
    const questionFile = questionFiles[i];
    const timestamp = questionFile.replace('sat_question_', '').replace('.json', '');
    const questionNumber = String(i + 1).padStart(3, '0');
    const questionId = `question-${questionNumber}`;
    
    console.log(`[${i + 1}/${questionFiles.length}] Processing ${questionFile}...`);
    console.log(`  └─ ID: ${questionId}, Timestamp: ${timestamp}`);
    
    try {
      // Read question data
      const questionPath = path.join(EXPORT_DIR, questionFile);
      const questionData: QuestionData = readJSON(questionPath);
      
      if (!questionData) {
        errorCount++;
        skippedFiles.push(questionFile);
        continue;
      }
      
      // Create question folder
      const questionDir = path.join(OUTPUT_DIR, questionId);
      if (!fs.existsSync(questionDir)) {
        fs.mkdirSync(questionDir, { recursive: true });
      }
      
      // Detect module type, category, and subtopic
      const moduleType = detectModuleType(questionData.question, questionData.choices);
      const category = detectCategory(questionData.question, moduleType);
      const subtopic = detectSubtopic(questionData.question, category);
      const tags = generateTags(questionData.question, category, moduleType);
      
      // Read validation and verification data if available
      const validationPath = path.join(EXPORT_DIR, `sat_validation_${timestamp}.json`);
      const verificationPath = path.join(EXPORT_DIR, `sat_verification_${timestamp}.json`);
      
      const validationData: ValidationData | null = readJSON(validationPath);
      const verificationData: VerificationData | null = readJSON(verificationPath);
      
      // Check for diagram
      const diagramPath = path.join(EXPORT_DIR, `sat_diagram_${timestamp}.png`);
      const hasDiagram = fs.existsSync(diagramPath);
      
      // Create enhanced metadata
      const metadata: EnhancedMetadata = {
        id: questionId,
        timestamp: timestamp,
        question: questionData.question,
        choices: questionData.choices,
        correctAnswer: questionData.correct_answer,
        correctAnswerIndex: answerToIndex(questionData.correct_answer),
        answerValue: questionData.answer_value,
        explanation: questionData.explanation,
        diagramDescription: questionData.diagram_description,
        hasDiagram: hasDiagram,
        moduleType: moduleType,
        category: category,
        subtopic: subtopic,
        difficulty: 'medium', // Default to medium; could be enhanced
        timeEstimate: 90,
        source: 'Azure OpenAI GPT-4',
        tags: tags,
      };
      
      // Add validation data if available
      if (validationData) {
        metadata.validation = {
          status: validationData.overall_status,
          geometricallyValid: validationData.geometrically_valid,
          questionDiagramMatch: validationData.question_diagram_match,
          solvable: validationData.solvable,
          terminologyCorrect: validationData.terminology_correct,
          warnings: validationData.warnings,
        };
      }
      
      // Add verification data if available
      if (verificationData) {
        metadata.verification = {
          qualityScore: verificationData.quality_score,
          answerCorrect: verificationData.answer_correct,
          recommendation: verificationData.recommendation,
        };
      }
      
      // Write metadata.json
      const metadataPath = path.join(questionDir, 'metadata.json');
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      console.log(`  ✓ Created metadata.json`);
      
      // Copy related files
      const htmlPath = path.join(EXPORT_DIR, `sat_complete_${timestamp}.html`);
      const summaryPath = path.join(EXPORT_DIR, `sat_summary_${timestamp}.txt`);
      
      if (copyFileIfExists(htmlPath, path.join(questionDir, 'question.html'))) {
        console.log(`  ✓ Copied question.html`);
      }
      
      if (copyFileIfExists(diagramPath, path.join(questionDir, 'diagram.png'))) {
        console.log(`  ✓ Copied diagram.png`);
      }
      
      if (copyFileIfExists(summaryPath, path.join(questionDir, 'summary.txt'))) {
        console.log(`  ✓ Copied summary.txt`);
      }
      
      if (copyFileIfExists(validationPath, path.join(questionDir, 'validation.json'))) {
        console.log(`  ✓ Copied validation.json`);
      }
      
      if (copyFileIfExists(verificationPath, path.join(questionDir, 'verification.json'))) {
        console.log(`  ✓ Copied verification.json`);
      }
      
      successCount++;
      console.log(`  ✅ Question organized successfully\n`);
      
    } catch (error) {
      errorCount++;
      skippedFiles.push(questionFile);
      console.error(`  ❌ Error processing question:`, error);
      console.log('');
    }
  }
  
  // Create README.md in organized-questions folder
  const readmePath = path.join(OUTPUT_DIR, 'README.md');
  const readme = `# Organized Questions

This folder contains SAT questions organized into a standardized structure.

## Structure

Each question is in its own folder: \`question-XXX/\`

### Files in Each Question Folder:

- **metadata.json** (required) - Complete question data for database import
- **question.html** (required) - Formatted HTML version of the question
- **diagram.png** (optional) - Visual diagram or chart
- **summary.txt** (optional) - Human-readable summary
- **validation.json** (optional) - Technical validation results
- **verification.json** (optional) - Quality verification results

## Import to Database

To import these questions into the DuckSAT database:

\`\`\`bash
npm run questions:import
# or
npx tsx scripts/import-organized-questions.ts
\`\`\`

## Statistics

- Total questions: ${successCount}
- Generated: ${new Date().toISOString()}
- Source: Azure export folder

## Question Categories

Questions are automatically categorized by:
- Module type (math or reading-writing)
- Category (geometry, algebra, reading-comprehension, etc.)
- Difficulty level (easy, medium, hard)

---

For more information, see: SPECS/QUESTION_IMPORT_SPEC.md
`;
  
  fs.writeFileSync(readmePath, readme);
  
  // Print summary
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Organization Summary                                   ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║ ✅ Successfully organized: ${String(successCount).padStart(3)}                         ║`);
  console.log(`║ ❌ Failed:                 ${String(errorCount).padStart(3)}                         ║`);
  console.log(`║ 📊 Total processed:        ${String(questionFiles.length).padStart(3)}                         ║`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  if (skippedFiles.length > 0) {
    console.log('⚠️  Skipped files:');
    skippedFiles.forEach(f => console.log(`   - ${f}`));
    console.log('');
  }
  
  console.log(`✨ Questions organized in: ${OUTPUT_DIR}`);
  console.log(`📖 See README: ${readmePath}\n`);
  
  if (errorCount > 0) {
    process.exit(1);
  }
}

// Run the script
organizeQuestions().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
