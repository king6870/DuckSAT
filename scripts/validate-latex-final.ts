/**
 * Validate LaTeX in Database
 * 
 * Post-migration validation script to verify all LaTeX expressions are:
 * - Clean (no control characters)
 * - Properly escaped (single backslash)
 * - Wrapped in $...$ delimiters
 * - Parseable by KaTeX
 * 
 * Usage: tsx scripts/validate-latex-final.ts
 * 
 * @see docs/specs/SPEC-LATEX-001.md Section 8.3
 */

import { PrismaClient } from '@prisma/client';
import { validateLatex, ValidationResult } from './lib/normalize-latex';

const prisma = new PrismaClient();

interface FieldValidation {
  field: string;
  validationResult: ValidationResult;
}

interface QuestionValidation {
  questionId: string;
  category: string;
  fieldValidations: FieldValidation[];
  hasErrors: boolean;
}

async function validateAllQuestions() {
  console.log('\n🔍 LaTeX Validation Report');
  console.log('========================\n');
  
  try {
    // Fetch all active questions
    const questions = await prisma.question.findMany({
      where: { isActive: true },
      select: {
        id: true,
        question: true,
        options: true,
        explanation: true,
        passage: true,
        wrongAnswerExplanations: true,
        category: true
      }
    });
    
    console.log(`📊 Questions to check: ${questions.length}\n`);
    
    let totalFields = 0;
    let fieldsWithLatex = 0;
    let fieldsWithErrors = 0;
    let totalControlChars = 0;
    let totalDoubleBackslashes = 0;
    let totalUnwrappedLatex = 0;
    let totalKatexErrors = 0;
    let totalExpressions = 0;
    let validExpressions = 0;
    
    const questionValidations: QuestionValidation[] = [];
    
    // Validate each question
    for (const question of questions) {
      const fieldValidations: FieldValidation[] = [];
      let questionHasErrors = false;
      
      // Validate each text field
      const fieldsToCheck = [
        { name: 'question', value: question.question },
        { name: 'explanation', value: question.explanation },
        { name: 'options', value: question.options },
        { name: 'passage', value: question.passage },
        { name: 'wrongAnswerExplanations', value: question.wrongAnswerExplanations }
      ];
      
      for (const field of fieldsToCheck) {
        if (!field.value) continue;
        
        totalFields++;
        
        // Check if field contains LaTeX
        if (field.value.includes('\\') || field.value.includes('$')) {
          fieldsWithLatex++;
        }
        
        const validationResult = validateLatex(field.value);
        
        if (!validationResult.isValid) {
          fieldsWithErrors++;
          questionHasErrors = true;
          
          // Categorize errors
          for (const error of validationResult.errors) {
            if (error.error.includes('Control character')) totalControlChars++;
            if (error.error.includes('Double backslash')) totalDoubleBackslashes++;
            if (error.error.includes('KaTeX')) totalKatexErrors++;
          }
        }
        
        totalExpressions += validationResult.totalExpressions;
        validExpressions += validationResult.validExpressions;
        
        fieldValidations.push({
          field: field.name,
          validationResult
        });
      }
      
      if (questionHasErrors) {
        questionValidations.push({
          questionId: question.id,
          category: question.category,
          fieldValidations,
          hasErrors: true
        });
      }
    }
    
    // Print summary
    console.log('=== Summary ===\n');
    console.log(`Questions checked: ${questions.length}`);
    console.log(`Fields scanned: ${totalFields}`);
    console.log(`Fields with LaTeX: ${fieldsWithLatex}`);
    console.log(`\nLaTeX Expressions:`);
    console.log(`  Total found: ${totalExpressions}`);
    console.log(`  Valid: ${validExpressions}`);
    console.log(`  Invalid: ${totalExpressions - validExpressions}`);
    console.log(`\nError Breakdown:`);
    console.log(`  Control characters: ${totalControlChars} ${totalControlChars === 0 ? '✅' : '❌'}`);
    console.log(`  Double backslashes: ${totalDoubleBackslashes} ${totalDoubleBackslashes === 0 ? '✅' : '❌'}`);
    console.log(`  KaTeX parse errors: ${totalKatexErrors} ${totalKatexErrors === 0 ? '✅' : '❌'}`);
    console.log(`\nFields with errors: ${fieldsWithErrors} ${fieldsWithErrors === 0 ? '✅' : '❌'}`);
    
    // Print detailed errors
    if (questionValidations.length > 0) {
      console.log(`\n\n=== Questions with Errors (${questionValidations.length}) ===\n`);
      
      let count = 0;
      for (const qv of questionValidations) {
        count++;
        if (count > 10) {
          console.log(`\n... and ${questionValidations.length - 10} more questions with errors.\n`);
          break;
        }
        
        console.log(`\n❌ Question ID: ${qv.questionId} (${qv.category})`);
        
        for (const fv of qv.fieldValidations) {
          if (!fv.validationResult.isValid) {
            console.log(`   Field: ${fv.field}`);
            for (const error of fv.validationResult.errors.slice(0, 3)) {
              console.log(`     - ${error.error}`);
              if (error.expression) {
                console.log(`       Expression: ${error.expression.slice(0, 50)}${error.expression.length > 50 ? '...' : ''}`);
              }
            }
          }
        }
      }
    }
    
    // Final result
    console.log(`\n\n=== RESULT ===\n`);
    if (fieldsWithErrors === 0 && totalKatexErrors === 0) {
      console.log('✅ PASS - All LaTeX expressions are valid!\n');
      return true;
    } else {
      console.log('❌ FAIL - Validation errors found. Run migration script to fix.\n');
      return false;
    }
    
  } catch (error: any) {
    console.error('\n❌ Validation error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run validation
validateAllQuestions()
  .then((passed) => {
    process.exit(passed ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
