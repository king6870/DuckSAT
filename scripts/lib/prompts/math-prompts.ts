/**
 * Math Prompt Templates for QG800
 * 
 * @see docs/specs/SYSTEM-INSTRUCTIONS-QG800.md
 */

import { Difficulty, PromptBuilder } from '../generation-types';

/**
 * Global System Prompt (used for ALL math questions)
 */
export const MATH_SYSTEM_PROMPT = `You are an expert SAT test question writer with deep knowledge of College Board SAT standards.
You create realistic, pedagogically sound questions that match actual SAT difficulty and style.

ABSOLUTE RULES — VIOLATION = REJECTION:

0. **JSON ESCAPING**: In JSON strings, backslashes must be escaped. Write LaTeX commands with DOUBLE backslashes: "\\\\frac", "\\\\sqrt", "\\\\cdot", "\\\\%". Example: "$2\\\\times 3$" or "$5\\\\%$".
1. Return ONLY a valid JSON array. No markdown fences, no commentary, no trailing commas.
2. Every question must have EXACTLY 4 options.
3. Options must be labeled "A) ", "B) ", "C) ", "D) " with the letter, closing paren, and a space.
4. correctAnswer is an integer 0-3 (0=A, 1=B, 2=C, 3=D).
5. Explanation must show step-by-step reasoning.
6. wrongAnswerExplanations must explain the specific mistake each wrong option represents.
7. ALL math must follow the LaTeX rules below — no exceptions.

LATEX RULES:
- Wrap ALL math in single dollar signs: $x^2 + 1$
- In JSON, use DOUBLE backslash: $\\\\frac{a}{b}$, $\\\\sqrt{x}$, $\\\\times$, $\\\\cdot$, $\\\\%$
- Use plain parentheses ( ) for simple grouping: $\\\\sin(x)$, $(x + 1)^2$
- Use \\\\left( \\\\right) ONLY when content is tall (fractions, sums, matrices)
- For currency, write "25 dollars" or "USD 25" — NEVER use $ for money
- For multiplication, use $\\\\times$ or $\\\\cdot$ — NEVER use *
- For degrees, use $90°$ or $90\\\\degree$ — NEVER use "degrees" after a number in math mode
- NEVER use \\\\text{} inside answer options unless absolutely necessary
- NEVER split a LaTeX expression across multiple $ delimiters

FORMATTING:
- question field: may contain LaTeX inline
- passage field: must be null for math questions
- options: each is a string, may contain LaTeX; always prefixed with "A) ", "B) ", "C) ", "D) "
- explanation: step-by-step solution with LaTeX inline
- wrongAnswerExplanations: object with keys "A","B","C","D" (excluding correct answer)

REQUIRED JSON SCHEMA:
Each question MUST include these exact fields:
{
  "question": "string with LaTeX",
  "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
  "correctAnswer": 0-3,
  "explanation": "step-by-step string with LaTeX",
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
- Single-step or two-step problems
- Straightforward application of one concept
- Clear, unambiguous wording
- Numbers are manageable (small integers, simple fractions)
- The correct approach is obvious to a student who knows the concept
- Distractors represent basic errors (arithmetic mistakes, misreading)
- A well-prepared student should solve in under 60 seconds`,

  medium: `MEDIUM DIFFICULTY GUIDANCE:
- Multi-step problems (2-3 steps)
- May combine two related concepts
- Moderate wording that requires careful reading
- Numbers may require more computation but are still reasonable
- The correct approach requires some strategic thinking
- Distractors represent conceptual misunderstandings (not just arithmetic)
- A well-prepared student should solve in 60-90 seconds`,

  hard: `HARD DIFFICULTY GUIDANCE:
- Complex multi-step problems (3+ steps)
- Combines multiple concepts or requires creative problem-solving
- May include abstract reasoning or non-obvious setup
- May have tricky wording that requires very careful reading
- The correct approach is not immediately obvious
- Distractors represent sophisticated errors (partial solutions, common traps)
- A well-prepared student may need 90-120 seconds
- At least one distractor should be the answer to a "halfway done" approach`,
};

/**
 * Algebra Prompt Builder
 */
export const algebraPrompt: PromptBuilder = (subtopic: string, difficulty: Difficulty, count: number) => {
  return {
    system: MATH_SYSTEM_PROMPT,
    user: `Generate ${count} SAT Math questions about ALGEBRA.

TOPIC: Algebra
SUBTOPICS to cover (distribute evenly):
- linear-equations: Solving for x, multi-step equations, setting up equations from word problems
- inequalities: Solving and graphing inequalities, compound inequalities, absolute value inequalities
- systems: Systems of 2 equations, substitution, elimination, word problems with systems
- polynomials: Adding/subtracting/multiplying polynomials, factoring, polynomial division
- absolute-value: Absolute value equations, distance interpretation, piecewise behavior

DIFFICULTY: ${difficulty}
${DIFFICULTY_GUIDANCE[difficulty]}

REQUIREMENTS:
- Each question tests a DIFFERENT algebra skill
- Include word problems (at least ${Math.ceil(count / 3)} of ${count})
- At least 1 question should require setting up an equation from a real-world scenario
- Wrong answers must represent common student mistakes (sign errors, distribution errors, etc.)
- Use realistic numbers (avoid contrived values that make computation trivial)

Return a JSON array of ${count} question objects. Each object must have:
{
  "question": "question text with LaTeX",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correctAnswer": 0-3,
  "explanation": "step-by-step solution",
  "wrongAnswerExplanations": {"A": "why wrong", "B": "why wrong", ...},
  "difficulty": "${difficulty}",
  "subtopic": "one of the subtopics above",
  "passage": null
}`,
  };
};

/**
 * Geometry Prompt Builder
 */
export const geometryPrompt: PromptBuilder = (subtopic: string, difficulty: Difficulty, count: number) => {
  return {
    system: MATH_SYSTEM_PROMPT,
    user: `Generate ${count} SAT Math questions about GEOMETRY.

TOPIC: Geometry & Trigonometry
SUBTOPICS to cover (distribute evenly):
- triangles: Triangle angle sum, Pythagorean theorem, similar triangles, special right triangles (30-60-90, 45-45-90)
- circles: Arc length, sector area, central/inscribed angles, equation of a circle $(x-h)^2 + (y-k)^2 = r^2$
- coordinate-geometry: Distance formula, midpoint, slope between two points, equations of lines
- area-perimeter: Area of composite shapes, perimeter with missing sides, area of regular polygons
- angles: Supplementary, complementary, vertical angles, parallel lines cut by transversal
- transformations: Reflections, rotations, translations (describe verbally, no diagrams needed)

DIFFICULTY: ${difficulty}
${DIFFICULTY_GUIDANCE[difficulty]}

REQUIREMENTS:
- At least ${Math.ceil(count / 2)} questions should reference a described geometric figure (e.g., "In triangle ABC where angle A = 30°...")
- Use $\\triangle ABC$, $\\overline{AB}$, $\\angle A$ notation consistently
- Include 1-2 coordinate geometry problems with specific points
- Wrong answers must represent common geometry mistakes (forgetting to halve, wrong formula, etc.)

Return a JSON array of ${count} question objects with the same schema as above.`,
  };
};

/**
 * Statistics Prompt Builder
 */
export const statisticsPrompt: PromptBuilder = (subtopic: string, difficulty: Difficulty, count: number) => {
  return {
    system: MATH_SYSTEM_PROMPT,
    user: `Generate ${count} SAT Math questions about STATISTICS AND DATA ANALYSIS.

TOPIC: Problem-Solving and Data Analysis
SUBTOPICS to cover (distribute evenly):
- mean-median-mode: Computing averages, effect of adding/removing values, weighted averages
- probability: Simple probability, conditional probability, "at least one" problems
- scatter-plots: Interpreting described scatter plots, line of best fit, correlation
- trends: Percent increase/decrease, growth patterns, interpreting tables of data
- standard-deviation: Understanding spread, comparing distributions, effect of transformations

DIFFICULTY: ${difficulty}
${DIFFICULTY_GUIDANCE[difficulty]}

REQUIREMENTS:
- At least ${Math.ceil(2 * count / 3)} questions must present data in text form (e.g., "A survey of 200 students found that...")
- Do NOT reference visual charts/graphs that aren't provided (describe all data in text)
- Include 1-2 ratio/proportion problems
- At least 1 probability question
- Wrong answers should reflect common errors (confusing mean with median, incorrect percentage calculation, etc.)

Return a JSON array of ${count} question objects with the same schema as above.`,
  };
};

/**
 * Quadratic Equations Prompt Builder
 */
export const quadraticPrompt: PromptBuilder = (subtopic: string, difficulty: Difficulty, count: number) => {
  return {
    system: MATH_SYSTEM_PROMPT,
    user: `Generate ${count} SAT Math questions about QUADRATIC EQUATIONS.

TOPIC: Quadratic Equations & Functions
SUBTOPICS to cover (distribute evenly):
- factoring: Factor quadratics, find roots, zero product property
- completing-square: Convert standard to vertex form, find vertex by completing the square
- quadratic-formula: Apply $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$, discriminant analysis
- vertex-form: Interpret $a(x-h)^2 + k$, identify vertex, axis of symmetry, max/min

DIFFICULTY: ${difficulty}
${DIFFICULTY_GUIDANCE[difficulty]}

REQUIREMENTS:
- Use standard form $ax^2 + bx + c = 0$ in at least ${Math.ceil(count / 2)} questions
- Include 1 real-world application (projectile motion, area optimization, profit maximization)
- At least 1 question should ask about the discriminant ($b^2 - 4ac$) and number of real solutions
- Wrong answers should trap students who forget to factor completely, lose a sign, or misapply the formula

Return a JSON array of ${count} question objects with the same schema as above.`,
  };
};

/**
 * Linear Functions Prompt Builder
 */
export const linearFunctionsPrompt: PromptBuilder = (subtopic: string, difficulty: Difficulty, count: number) => {
  return {
    system: MATH_SYSTEM_PROMPT,
    user: `Generate ${count} SAT Math questions about LINEAR FUNCTIONS.

TOPIC: Linear Functions & Graphs
SUBTOPICS to cover (distribute evenly):
- slope-intercept: Write equations in $y = mx + b$, identify slope and y-intercept from equation/description
- point-slope: Use $y - y_1 = m(x - x_1)$, convert forms
- parallel-perpendicular: Identify parallel (same slope) and perpendicular (negative reciprocal) lines
- graphing: Interpret described graphs, x/y intercepts, increasing/decreasing behavior

DIFFICULTY: ${difficulty}
${DIFFICULTY_GUIDANCE[difficulty]}

REQUIREMENTS:
- At least ${Math.ceil(count / 2)} questions should give real-world linear relationships (e.g., "A car rental company charges...")
- Include 1 question about parallel or perpendicular lines
- At least 1 question should involve interpreting slope as rate of change
- Wrong answers should represent: sign errors in slope, confusing rise/run, wrong intercept

Return a JSON array of ${count} question objects with the same schema as above.`,
  };
};

/**
 * Advanced Math Prompt Builder
 */
export const advancedMathPrompt: PromptBuilder = (subtopic: string, difficulty: Difficulty, count: number) => {
  return {
    system: MATH_SYSTEM_PROMPT,
    user: `Generate ${count} SAT Math questions about ADVANCED MATH.

TOPIC: Advanced Math (Passport to Advanced Math)
SUBTOPICS to cover (distribute evenly):
- exponentials: Exponential growth/decay ($y = a \\cdot b^x$), compound interest, half-life problems
- logarithms: Evaluate $\\log_b(x)$, properties of logarithms, change of base, solving log equations
- rational-expressions: Simplify $\\frac{p(x)}{q(x)}$, find restrictions, add/subtract rational expressions
- complex-numbers: Operations with $i$ where $i^2 = -1$, simplify powers of $i$, complex conjugates

DIFFICULTY: ${difficulty}
${DIFFICULTY_GUIDANCE[difficulty]}

REQUIREMENTS:
- At least ${Math.ceil(count / 2)} real-world application problems (population growth, radioactive decay, investment)
- Include 1 question that requires recognizing exponential vs. linear growth
- At least 1 question requiring knowledge of logarithm properties ($\\log(ab) = \\log a + \\log b$, etc.)
- Wrong answers should reflect: confusing growth/decay, log property errors, forgetting domain restrictions

Return a JSON array of ${count} question objects with the same schema as above.`,
  };
};

/**
 * Prompt Registry (maps topic ID to prompt builder)
 */
export const MATH_PROMPT_BUILDERS: Record<string, PromptBuilder> = {
  'algebra': algebraPrompt,
  'geometry': geometryPrompt,
  'statistics': statisticsPrompt,
  'quadratic': quadraticPrompt,
  'linear-functions': linearFunctionsPrompt,
  'advanced-math': advancedMathPrompt,
};
