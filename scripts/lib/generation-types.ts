/**
 * TypeScript interfaces for QG800 Question Generation Pipeline
 * 
 * @see docs/specs/SPEC-QG800.md
 * @see docs/specs/SYSTEM-INSTRUCTIONS-QG800.md
 */

export type ModuleType = 'math' | 'reading-writing';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

/**
 * Generated Question (before DB import)
 */
export interface GeneratedQuestion {
  // Core fields (match Prisma schema)
  question: string;                    // Question text with LaTeX
  options: string[];                   // Array: ["A) ...", "B) ...", "C) ...", "D) ..."]
  correctAnswer: number;               // 0-3 index
  explanation: string;                 // Detailed solution with LaTeX
  
  // Classification
  moduleType: ModuleType;              // "math" | "reading-writing"
  category: string;                    // "algebra" | "geometry" | "reading-comprehension" etc.
  subtopic: string;                    // Fine-grained topic
  difficulty: Difficulty;              // "easy" | "medium" | "hard"
  difficultyScore: number;             // 25 | 50 | 75
  
  // Optional
  passage?: string;                    // Reading passage (reading questions only)
  visualType: string;                  // "none" for now (diagrams deferred to P1)
  wrongAnswerExplanations?: Record<string, string>;  // {"A": "why wrong", "B": ...}
  
  // Metadata (not in DB, for tracking)
  _batchId: string;                    // e.g. "batch-001-algebra"
  _generatedAt: string;                // ISO timestamp
  _promptVersion: string;              // Prompt template version
  _validated: boolean;                 // KaTeX validation passed
  _approvalStatus: ApprovalStatus;     // "pending" | "approved" | "rejected"
}

/**
 * Batch File Format (JSON stored in generated-batches/)
 */
export interface BatchFile {
  batchId: string;                     // "batch-001-algebra"
  topic: string;                       // "algebra"
  moduleType: ModuleType;              // "math" | "reading-writing"
  generatedAt: string;                 // ISO timestamp
  promptVersion: string;               // "v1.0"
  totalRequested: number;              // 20
  totalGenerated: number;              // 20
  totalValid: number;                  // 19 (passed KaTeX)
  totalInvalid: number;                // 1 (failed KaTeX)
  questions: GeneratedQuestion[];      // Array of questions
}

/**
 * Batch Summary (in generation-state.json)
 */
export interface BatchSummary {
  batchId: string;
  topic: string;
  moduleType: ModuleType;
  generatedAt: string;
  totalGenerated: number;
  totalValid: number;
  totalInvalid: number;
  status: ApprovalStatus;              // "pending" | "approved" | "rejected"
  approvedAt?: string;
  rejectedQuestions?: number[];        // Indices of rejected questions
}

/**
 * Generation State Tracker (generation-state.json)
 */
export interface GenerationState {
  startedAt: string;
  lastUpdatedAt: string;
  target: {
    reading: number;                   // 400
    math: number;                      // 400
  };
  current: {
    reading: number;                   // DB count at start
    math: number;                      // DB count at start
  };
  generated: {
    reading: number;                   // Successfully generated
    math: number;
  };
  approved: {
    reading: number;                   // Imported to DB
    math: number;
  };
  batches: BatchSummary[];             // Per-batch status
}

/**
 * Topic Configuration
 */
export interface TopicConfig {
  id: string;                          // "algebra"
  moduleType: ModuleType;              // "math"
  category: string;                    // DB category value
  subtopics: string[];                 // ["linear-equations", "inequalities", ...]
  target: number;                      // How many to generate
  difficulty: DifficultyDistribution;  // {easy: 0.3, medium: 0.5, hard: 0.2}
  batchSize: number;                   // 20
}

/**
 * Difficulty Distribution
 */
export interface DifficultyDistribution {
  easy: number;                        // 0.30 (30%)
  medium: number;                      // 0.50 (50%)
  hard: number;                        // 0.20 (20%)
}

/**
 * Azure OpenAI Configuration
 */
export interface AzureOpenAIConfig {
  apiKey: string;
  endpoint: string;
  deployment: string;
  apiVersion: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  questionsPerCall: number;            // 5
  delayBetweenCalls: number;           // 1000ms
  maxRetries: number;                  // 3
  retryDelay: number;                  // 5000ms
}

/**
 * Prompt Builder Function Type
 */
export type PromptBuilder = (
  subtopic: string,
  difficulty: Difficulty,
  count: number
) => { system: string; user: string };

/**
 * Generation Result (per LLM call)
 */
export interface GenerationResult {
  success: boolean;
  questions: GeneratedQuestion[];
  errors: string[];
  retries: number;
}

/**
 * LaTeX Validation Result
 */
export interface LaTeXValidationResult {
  isValid: boolean;
  invalidExpressions: Array<{
    expression: string;
    error: string;
    location: string;                  // "question" | "option-A" | "explanation" etc.
  }>;
}

/**
 * Rejected Question Log Entry
 */
export interface RejectedQuestionEntry {
  batchId: string;
  questionIndex: number;
  question: string;
  reason: string;                      // "latex-error" | "low-quality" | "duplicate"
  rejectedAt: string;
  latexErrors?: string[];
}
