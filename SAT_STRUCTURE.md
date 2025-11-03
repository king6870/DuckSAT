# SAT Question Structure Implementation

## Overview

This document outlines the implementation of the three core requirements for the DuckSAT question system:

1. ✅ **Questions have difficulty levels** (easy, medium, hard)
2. ✅ **Comprehensive topics and subtopics for English and Math**
3. ✅ **Each subtopic targets 100+ questions with varying difficulty levels**

## 1. Question Difficulty Levels

The `Question` model in the database includes a `difficulty` field that accepts:
- `easy` - Basic understanding and straightforward application
- `medium` - Moderate complexity requiring analysis and application
- `hard` - Advanced reasoning and complex problem-solving

## 2. SAT Topics and Subtopics Structure

### English/Reading-Writing Module (12 Subtopics)

#### Reading Comprehension (7 subtopics)
1. **Main Ideas and Central Claims** - 100 questions (40% easy, 40% medium, 20% hard)
2. **Supporting Details and Evidence** - 100 questions (35% easy, 45% medium, 20% hard)
3. **Inferences and Implications** - 100 questions (30% easy, 50% medium, 20% hard)
4. **Vocabulary in Context** - 100 questions (40% easy, 40% medium, 20% hard)
5. **Text Structure and Organization** - 100 questions (35% easy, 45% medium, 20% hard)
6. **Author's Purpose and Point of View** - 100 questions (30% easy, 50% medium, 20% hard)
7. **Comparing Texts and Viewpoints** - 100 questions (25% easy, 50% medium, 25% hard)

#### Writing and Language (5 subtopics)
1. **Grammar and Usage** - 100 questions (40% easy, 40% medium, 20% hard)
2. **Punctuation and Mechanics** - 100 questions (45% easy, 35% medium, 20% hard)
3. **Sentence Structure and Style** - 100 questions (35% easy, 45% medium, 20% hard)
4. **Rhetorical Skills** - 100 questions (30% easy, 50% medium, 20% hard)
5. **Transitions and Logical Flow** - 100 questions (35% easy, 45% medium, 20% hard)

### Math Module (14 Subtopics)

#### Algebra (6 subtopics)
1. **Linear Equations and Inequalities** - 100 questions (40% easy, 40% medium, 20% hard)
2. **Systems of Equations** - 100 questions (35% easy, 45% medium, 20% hard)
3. **Quadratic Functions and Equations** - 100 questions (35% easy, 45% medium, 20% hard)
4. **Polynomial Expressions** - 100 questions (35% easy, 45% medium, 20% hard)
5. **Exponential and Logarithmic Functions** - 100 questions (30% easy, 50% medium, 20% hard)
6. **Rational Expressions and Equations** - 100 questions (30% easy, 45% medium, 25% hard)

#### Advanced Math (3 subtopics)
1. **Functions and Transformations** - 100 questions (30% easy, 50% medium, 20% hard)
2. **Complex Numbers** - 100 questions (25% easy, 50% medium, 25% hard)
3. **Sequences and Series** - 100 questions (35% easy, 45% medium, 20% hard)

#### Geometry and Trigonometry (6 subtopics)
1. **Coordinate Geometry** - 100 questions (40% easy, 40% medium, 20% hard)
2. **Area, Volume, and Surface Area** - 100 questions (45% easy, 35% medium, 20% hard)
3. **Triangles and Polygons** - 100 questions (40% easy, 40% medium, 20% hard)
4. **Circles** - 100 questions (35% easy, 45% medium, 20% hard)
5. **Trigonometry** - 100 questions (30% easy, 50% medium, 20% hard)
6. **Geometric Reasoning and Proofs** - 100 questions (25% easy, 50% medium, 25% hard)

#### Statistics and Probability (5 subtopics)
1. **Descriptive Statistics** - 100 questions (40% easy, 40% medium, 20% hard)
2. **Probability Basics** - 100 questions (40% easy, 40% medium, 20% hard)
3. **Conditional Probability** - 100 questions (30% easy, 50% medium, 20% hard)
4. **Data Analysis and Interpretation** - 100 questions (40% easy, 40% medium, 20% hard)
5. **Statistical Inference** - 100 questions (25% easy, 50% medium, 25% hard)

## 3. Question Distribution Summary

### Total Structure
- **5 Main Topics** (Reading Comprehension, Writing & Language, Algebra, Advanced Math, Geometry & Trigonometry, Statistics & Probability)
- **26 Subtopics** (12 English + 14 Math)
- **2,600 Target Questions** (26 subtopics × 100 questions each)

### Difficulty Distribution
- **Easy Questions**: ~35-45% per subtopic (910-1,170 total questions)
- **Medium Questions**: ~40-50% per subtopic (1,040-1,300 total questions)
- **Hard Questions**: ~20-25% per subtopic (520-650 total questions)

### Module Breakdown
- **Reading-Writing Module**: 1,200 questions across 12 subtopics
- **Math Module**: 1,400 questions across 14 subtopics

## Database Schema

### Topic Model
```typescript
model Topic {
  id: string          // Unique identifier
  name: string        // Topic name (e.g., "Algebra")
  moduleType: string  // 'reading-writing' | 'math'
  description: string // Topic description
  subtopics: Subtopic[] // Related subtopics
}
```

### Subtopic Model
```typescript
model Subtopic {
  id: string              // Unique identifier
  topicId: string         // Parent topic ID
  name: string            // Subtopic name
  description: string     // Subtopic description
  targetQuestions: number // Target question count (100)
  currentCount: number    // Current question count
  questions: Question[]   // Related questions
}
```

### Enhanced Question Model
```typescript
model Question {
  id: string              // Unique identifier
  subtopicId: string      // Link to subtopic
  moduleType: string      // 'reading-writing' | 'math'
  difficulty: string      // 'easy' | 'medium' | 'hard'
  category: string        // Broad category
  subtopic: string        // Specific subtopic
  question: string        // Question text
  passage?: string        // Reading passage (if applicable)
  options: string[]       // Answer choices
  correctAnswer: number   // Correct answer index
  explanation: string     // Detailed explanation
  // ... other fields
}
```

## Setup Instructions

1. **Update Database Schema**
   ```bash
   npm run db:push
   ```

2. **Seed Topics and Subtopics**
   ```bash
   npm run db:seed-topics
   ```

3. **Verify Setup**
   ```bash
   npm run db:studio
   ```

## Usage

### Accessing Topic Structure
```typescript
import { SAT_TOPICS, getAllSubtopics, getTotalTargetQuestions } from '@/data/sat-topics'

// Get all subtopics
const allSubtopics = getAllSubtopics()

// Get total target questions
const totalQuestions = getTotalTargetQuestions() // 2,600

// Get topics by module
const mathTopics = getSubtopicsByModule('math')
```

### Database Queries
```typescript
// Get all topics with subtopics
const topics = await prisma.topic.findMany({
  include: { subtopics: true }
})

// Get questions by subtopic and difficulty
const easyAlgebraQuestions = await prisma.question.findMany({
  where: {
    subtopic: { name: 'Linear Equations and Inequalities' },
    difficulty: 'easy'
  }
})
```

This structure provides a solid foundation for organizing and managing SAT questions with proper difficulty distribution across comprehensive topic coverage.
