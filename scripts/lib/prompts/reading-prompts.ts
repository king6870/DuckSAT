/**
 * Reading Prompt Templates for QG800
 * 
 * @see docs/specs/SYSTEM-INSTRUCTIONS-QG800.md
 */

import { Difficulty, PromptBuilder } from '../generation-types';

/**
 * Global System Prompt (used for ALL reading questions)
 */
export const READING_SYSTEM_PROMPT = `You are an expert SAT test question writer with deep knowledge of College Board SAT standards.
You create realistic, pedagogically sound questions that match actual SAT difficulty and style.

ABSOLUTE RULES — VIOLATION = REJECTION:

1. Return ONLY a valid JSON array. No markdown fences, no commentary, no trailing commas.
2. Every question must have EXACTLY 4 options.
3. Options must be labeled "A) ", "B) ", "C) ", "D) " with the letter, closing paren, and a space.
4. correctAnswer is an integer 0-3 (0=A, 1=B, 2=C, 3=D).
5. Explanation must show step-by-step reasoning.
6. wrongAnswerExplanations must explain the specific mistake each wrong option represents.
7. NO math or LaTeX in reading questions — all plain English.

FORMATTING:
- question field: plain English question
- passage field: REQUIRED for all reading questions (150-250 words of academic prose)
- options: each is a string in plain English; always prefixed with "A) ", "B) ", "C) ", "D) "
- explanation: why the correct answer is right and others are wrong
- wrongAnswerExplanations: object with keys "A","B","C","D" (excluding correct answer)

REQUIRED JSON SCHEMA:
Each question MUST include these exact fields:
{
  "question": "string",
  "passage": "150-250 word passage (REQUIRED)",
  "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
  "correctAnswer": 0-3,
  "explanation": "string",
  "difficulty": "easy" | "medium" | "hard",
  "subtopic": "string (topic name)",
  "wrongAnswerExplanations": {
    "A": "why A is wrong (if not correct)",
    "B": "why B is wrong (if not correct)",
    etc.
  }
}`;

/**
 * Difficulty Guidance
 */
const DIFFICULTY_GUIDANCE = {
  easy: `EASY DIFFICULTY GUIDANCE:
- Straightforward comprehension questions
- Information stated directly in the passage
- Vocabulary with clear context clues
- Correct answer is unambiguous
- Distractors are clearly wrong with careful reading
- A well-prepared student should solve in under 60 seconds`,

  medium: `MEDIUM DIFFICULTY GUIDANCE:
- Requires inference beyond literal text
- May combine information from multiple parts of passage
- Vocabulary may have multiple meanings, requires context
- Correct answer requires moderate reasoning
- Distractors are plausible but distinguishable with careful analysis
- A well-prepared student should solve in 60-90 seconds`,

  hard: `HARD DIFFICULTY GUIDANCE:
- Requires complex inference or synthesis
- May involve understanding subtle nuance or tone
- Vocabulary in context with sophisticated usage
- Correct answer requires careful reasoning and elimination
- Distractors are sophisticated and may seem correct on first read
- A well-prepared student may need 90-120 seconds`,
};

/**
 * Reading Comprehension Prompt Builder
 */
export const readingCompPrompt: PromptBuilder = (subtopic: string, difficulty: Difficulty, count: number) => {
  return {
    system: READING_SYSTEM_PROMPT,
    user: `Generate ${count} SAT Reading & Writing questions about READING COMPREHENSION.

TOPIC: Information and Ideas
SUBTOPICS to cover (distribute evenly):
- main-idea: Central claim/thesis of a passage, summarization
- inference: What can be reasonably inferred, supported conclusions
- detail: Locating specific information, factual recall
- purpose: Author's purpose for a paragraph or phrase

For EACH question, you MUST generate a passage (150-250 words). Each passage should be:
- An excerpt from a plausible nonfiction source (science journal, historical document, social science study, literary criticism)
- Written at SAT-appropriate reading level (Grade 10-12 prose)
- Self-contained (reader doesn't need outside context)
- Intellectually engaging with a clear argument or finding

DIFFICULTY: ${difficulty}
${DIFFICULTY_GUIDANCE[difficulty]}

PASSAGE DOMAINS (rotate through these):
1. Science: Research findings, experiments, natural phenomena
2. History/Social Studies: Historical analysis, political theory, economics
3. Literature: Literary criticism, author analysis, thematic discussion

REQUIREMENTS:
- NO math or LaTeX in reading questions (passage and question are plain English)
- Each passage must be UNIQUE — no recycling or paraphrasing the same topic
- Wrong answers should be plausible but clearly wrong when passage is read carefully
- At least ${Math.ceil(count / 3)} "detail" question should reference a specific part of the passage
- At least ${Math.ceil(count / 3)} "inference" question should require synthesis beyond literal text

Return a JSON array of ${count} question objects. Each object must have:
{
  "question": "plain English question",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correctAnswer": 0-3,
  "explanation": "why correct answer is right",
  "wrongAnswerExplanations": {"A": "why wrong", "B": "why wrong", ...},
  "difficulty": "${difficulty}",
  "subtopic": "one of: main-idea, inference, detail, purpose",
  "passage": "150-250 word passage (REQUIRED)"
}`,
  };
};

/**
 * Vocabulary Prompt Builder
 */
export const vocabularyPrompt: PromptBuilder = (subtopic: string, difficulty: Difficulty, count: number) => {
  return {
    system: READING_SYSTEM_PROMPT,
    user: `Generate ${count} SAT Reading & Writing questions about VOCABULARY IN CONTEXT.

TOPIC: Craft and Structure — Words in Context
SUBTOPICS:
- context-clues: Determine word/phrase meaning from surrounding text
- word-meaning: Choose the definition that matches how a word is used in context
- synonyms: Select the best replacement word that maintains passage meaning

For EACH question, generate a SHORT passage (80-120 words) that uses a target word in a specific context. The question asks what the underlined/bold word most nearly means.

DIFFICULTY: ${difficulty}
${DIFFICULTY_GUIDANCE[difficulty]}

REQUIREMENTS:
- Target words should have MULTIPLE dictionary meanings (e.g., "address", "bear", "issue", "grave", "qualified")
- The correct answer is the meaning used IN THIS CONTEXT, not the most common meaning
- Wrong answers should be other valid dictionary definitions of the same word
- NO math or LaTeX — all plain English
- Passages should feel like SAT excerpts (academic, literary, or scientific prose)

QUESTION FORMAT: "As used in the passage, '[target word]' most nearly means..."

Return a JSON array of ${count} question objects. Each object must have:
{
  "question": "As used in the passage, '[word]' most nearly means...",
  "options": ["A) definition 1", "B) definition 2", "C) definition 3", "D) definition 4"],
  "correctAnswer": 0-3,
  "explanation": "why this definition fits the context",
  "wrongAnswerExplanations": {"A": "why wrong", "B": "why wrong", ...},
  "difficulty": "${difficulty}",
  "subtopic": "context-clues",
  "passage": "80-120 word passage with target word (REQUIRED)"
}`,
  };
};

/**
 * Rhetoric Prompt Builder
 */
export const rhetoricPrompt: PromptBuilder = (subtopic: string, difficulty: Difficulty, count: number) => {
  return {
    system: READING_SYSTEM_PROMPT,
    user: `Generate ${count} SAT Reading & Writing questions about RHETORIC.

TOPIC: Craft and Structure — Rhetoric & Purpose
SUBTOPICS:
- author-purpose: Why did the author include a specific detail, paragraph, or phrase?
- tone: What is the author's tone/attitude toward the subject?
- sentence-function: What role does a specific sentence play in the argument structure?

For EACH question, generate a passage (120-180 words) with clear rhetorical structure.

DIFFICULTY: ${difficulty}
${DIFFICULTY_GUIDANCE[difficulty]}

REQUIREMENTS:
- Passages should have a discernible argument structure (claim → evidence → conclusion)
- Questions should require understanding of HOW the author builds the argument, not just WHAT they say
- Include ${Math.ceil(count / 2)} questions about the function of a specific sentence or paragraph
- Wrong answers should be plausible rhetorical purposes that don't match the actual text
- NO math or LaTeX

Return a JSON array of ${count} question objects. Each object must have:
{
  "question": "The author includes [specific detail] in order to...",
  "options": ["A) rhetorical purpose 1", "B) purpose 2", "C) purpose 3", "D) purpose 4"],
  "correctAnswer": 0-3,
  "explanation": "why this rhetorical purpose is correct",
  "wrongAnswerExplanations": {"A": "why wrong", "B": "why wrong", ...},
  "difficulty": "${difficulty}",
  "subtopic": "one of: author-purpose, tone, sentence-function",
  "passage": "120-180 word passage with rhetorical structure (REQUIRED)"
}`,
  };
};

/**
 * Synthesis Prompt Builder
 */
export const synthesisPrompt: PromptBuilder = (subtopic: string, difficulty: Difficulty, count: number) => {
  return {
    system: READING_SYSTEM_PROMPT,
    user: `Generate ${count} SAT Reading & Writing questions about SYNTHESIS.

TOPIC: Synthesis & Integration of Information
SUBTOPICS:
- compare-contrast: Compare arguments, findings, or perspectives from two described sources
- integrate-information: Combine information from a passage with additional described data

For EACH question, generate a passage (150-200 words) that presents information from TWO perspectives or sources. The question asks the student to synthesize or compare.

DIFFICULTY: ${difficulty}
${DIFFICULTY_GUIDANCE[difficulty]}

REQUIREMENTS:
- Each passage must present at least 2 distinct viewpoints, studies, or data sets
- Questions should require comparing, contrasting, or integrating information
- At least ${Math.ceil(count / 2)} question should ask "which statement would both authors/researchers agree on?"
- Wrong answers should reflect: misattributing a view to the wrong source, overgeneralizing, or missing nuance
- NO math or LaTeX

Return a JSON array of ${count} question objects. Each object must have:
{
  "question": "Based on the passage, which statement would both [Source 1] and [Source 2] agree with?",
  "options": ["A) statement 1", "B) statement 2", "C) statement 3", "D) statement 4"],
  "correctAnswer": 0-3,
  "explanation": "why both sources support this statement",
  "wrongAnswerExplanations": {"A": "why wrong", "B": "why wrong", ...},
  "difficulty": "${difficulty}",
  "subtopic": "one of: compare-contrast, integrate-information",
  "passage": "150-200 word passage with 2+ perspectives (REQUIRED)"
}`,
  };
};

/**
 * Prompt Registry (maps topic ID to prompt builder)
 */
export const READING_PROMPT_BUILDERS: Record<string, PromptBuilder> = {
  'reading-comp': readingCompPrompt,
  'vocabulary': vocabularyPrompt,
  'rhetoric': rhetoricPrompt,
  'synthesis': synthesisPrompt,
};
