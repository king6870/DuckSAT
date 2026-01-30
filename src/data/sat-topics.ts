// SAT Topics and Subtopics Structure
// Each subtopic should have minimum 100 questions with varying difficulty levels

export interface SATSubtopic {
  id: string
  name: string
  description: string
  targetQuestions: number
  difficultyDistribution: {
    easy: number    // percentage
    medium: number  // percentage
    hard: number    // percentage
  }
}

export interface SATTopic {
  id: string
  name: string
  moduleType: 'reading-writing' | 'math'
  description: string
  subtopics: SATSubtopic[]
}

export const SAT_TOPICS: SATTopic[] = [
  // ENGLISH/READING-WRITING MODULE
  {
    id: 'reading-comprehension',
    name: 'Reading Comprehension',
    moduleType: 'reading-writing',
    description: 'Understanding and analyzing written passages',
    subtopics: [
      {
        id: 'main-ideas-central-claims',
        name: 'Main Ideas and Central Claims',
        description: 'Identifying the primary purpose, main idea, or central claim of a passage',
        targetQuestions: 100,
        difficultyDistribution: { easy: 40, medium: 40, hard: 20 }
      },
      {
        id: 'supporting-details-evidence',
        name: 'Supporting Details and Evidence',
        description: 'Identifying and analyzing supporting evidence and details',
        targetQuestions: 100,
        difficultyDistribution: { easy: 35, medium: 45, hard: 20 }
      },
      {
        id: 'inferences-implications',
        name: 'Inferences and Implications',
        description: 'Drawing logical conclusions from text',
        targetQuestions: 100,
        difficultyDistribution: { easy: 30, medium: 50, hard: 20 }
      },
      {
        id: 'vocabulary-in-context',
        name: 'Vocabulary in Context',
        description: 'Understanding word meanings based on context',
        targetQuestions: 100,
        difficultyDistribution: { easy: 40, medium: 40, hard: 20 }
      },
      {
        id: 'text-structure-organization',
        name: 'Text Structure and Organization',
        description: 'Understanding how texts are organized and structured',
        targetQuestions: 100,
        difficultyDistribution: { easy: 35, medium: 45, hard: 20 }
      },
      {
        id: 'author-purpose-point-of-view',
        name: 'Author\'s Purpose and Point of View',
        description: 'Analyzing author\'s intent, perspective, and rhetorical strategies',
        targetQuestions: 100,
        difficultyDistribution: { easy: 30, medium: 50, hard: 20 }
      },
      {
        id: 'comparing-texts',
        name: 'Comparing Texts and Viewpoints',
        description: 'Analyzing relationships between paired passages',
        targetQuestions: 100,
        difficultyDistribution: { easy: 25, medium: 50, hard: 25 }
      }
    ]
  },
  {
    id: 'writing-language',
    name: 'Writing and Language',
    moduleType: 'reading-writing',
    description: 'Grammar, usage, and rhetorical skills',
    subtopics: [
      {
        id: 'grammar-usage',
        name: 'Grammar and Usage',
        description: 'Standard English conventions and grammar rules',
        targetQuestions: 100,
        difficultyDistribution: { easy: 40, medium: 40, hard: 20 }
      },
      {
        id: 'punctuation-mechanics',
        name: 'Punctuation and Mechanics',
        description: 'Proper use of punctuation marks and mechanical conventions',
        targetQuestions: 100,
        difficultyDistribution: { easy: 45, medium: 35, hard: 20 }
      },
      {
        id: 'sentence-structure-style',
        name: 'Sentence Structure and Style',
        description: 'Effective sentence construction and style',
        targetQuestions: 100,
        difficultyDistribution: { easy: 35, medium: 45, hard: 20 }
      },
      {
        id: 'rhetorical-skills',
        name: 'Rhetorical Skills',
        description: 'Effective communication and persuasive techniques',
        targetQuestions: 100,
        difficultyDistribution: { easy: 30, medium: 50, hard: 20 }
      },
      {
        id: 'transitions-logical-flow',
        name: 'Transitions and Logical Flow',
        description: 'Creating coherent connections between ideas',
        targetQuestions: 100,
        difficultyDistribution: { easy: 35, medium: 45, hard: 20 }
      }
    ]
  },

  // MATH MODULE
  {
    id: 'algebra',
    name: 'Algebra',
    moduleType: 'math',
    description: 'Linear equations, systems, and algebraic expressions',
    subtopics: [
      {
        id: 'linear-equations-inequalities',
        name: 'Linear Equations and Inequalities',
        description: 'Solving and graphing linear equations and inequalities',
        targetQuestions: 100,
        difficultyDistribution: { easy: 40, medium: 40, hard: 20 }
      },
      {
        id: 'systems-of-equations',
        name: 'Systems of Equations',
        description: 'Solving systems of linear equations and inequalities',
        targetQuestions: 100,
        difficultyDistribution: { easy: 35, medium: 45, hard: 20 }
      },
      {
        id: 'quadratic-functions-equations',
        name: 'Quadratic Functions and Equations',
        description: 'Working with quadratic expressions, equations, and functions',
        targetQuestions: 100,
        difficultyDistribution: { easy: 35, medium: 45, hard: 20 }
      },
      {
        id: 'polynomial-expressions',
        name: 'Polynomial Expressions',
        description: 'Operations with polynomials and rational expressions',
        targetQuestions: 100,
        difficultyDistribution: { easy: 35, medium: 45, hard: 20 }
      },
      {
        id: 'exponential-logarithmic-functions',
        name: 'Exponential and Logarithmic Functions',
        description: 'Exponential growth/decay and logarithmic functions',
        targetQuestions: 100,
        difficultyDistribution: { easy: 30, medium: 50, hard: 20 }
      },
      {
        id: 'rational-expressions-equations',
        name: 'Rational Expressions and Equations',
        description: 'Working with rational expressions and solving rational equations',
        targetQuestions: 100,
        difficultyDistribution: { easy: 30, medium: 45, hard: 25 }
      }
    ]
  },
  {
    id: 'advanced-math',
    name: 'Advanced Math',
    moduleType: 'math',
    description: 'Complex functions, equations, and mathematical reasoning',
    subtopics: [
      {
        id: 'functions-transformations',
        name: 'Functions and Transformations',
        description: 'Understanding function behavior and transformations',
        targetQuestions: 100,
        difficultyDistribution: { easy: 30, medium: 50, hard: 20 }
      },
      {
        id: 'complex-numbers',
        name: 'Complex Numbers',
        description: 'Operations with complex numbers and their properties',
        targetQuestions: 100,
        difficultyDistribution: { easy: 25, medium: 50, hard: 25 }
      },
      {
        id: 'sequences-series',
        name: 'Sequences and Series',
        description: 'Arithmetic and geometric sequences and series',
        targetQuestions: 100,
        difficultyDistribution: { easy: 35, medium: 45, hard: 20 }
      }
    ]
  },
  {
    id: 'geometry-trigonometry',
    name: 'Geometry and Trigonometry',
    moduleType: 'math',
    description: 'Geometric concepts, measurements, and trigonometric functions',
    subtopics: [
      {
        id: 'coordinate-geometry',
        name: 'Coordinate Geometry',
        description: 'Points, lines, and shapes in the coordinate plane',
        targetQuestions: 100,
        difficultyDistribution: { easy: 40, medium: 40, hard: 20 }
      },
      {
        id: 'area-volume-surface-area',
        name: 'Area, Volume, and Surface Area',
        description: 'Calculating areas, volumes, and surface areas of geometric figures',
        targetQuestions: 100,
        difficultyDistribution: { easy: 45, medium: 35, hard: 20 }
      },
      {
        id: 'triangles-polygons',
        name: 'Triangles and Polygons',
        description: 'Properties and relationships of triangles and polygons',
        targetQuestions: 100,
        difficultyDistribution: { easy: 40, medium: 40, hard: 20 }
      },
      {
        id: 'circles',
        name: 'Circles',
        description: 'Circle properties, equations, and related calculations',
        targetQuestions: 100,
        difficultyDistribution: { easy: 35, medium: 45, hard: 20 }
      },
      {
        id: 'trigonometry',
        name: 'Trigonometry',
        description: 'Trigonometric ratios, functions, and applications',
        targetQuestions: 100,
        difficultyDistribution: { easy: 30, medium: 50, hard: 20 }
      },
      {
        id: 'geometric-reasoning-proofs',
        name: 'Geometric Reasoning and Proofs',
        description: 'Logical reasoning and proof techniques in geometry',
        targetQuestions: 100,
        difficultyDistribution: { easy: 25, medium: 50, hard: 25 }
      }
    ]
  },
  {
    id: 'statistics-probability',
    name: 'Statistics and Probability',
    moduleType: 'math',
    description: 'Data analysis, statistics, and probability concepts',
    subtopics: [
      {
        id: 'descriptive-statistics',
        name: 'Descriptive Statistics',
        description: 'Measures of center, spread, and data interpretation',
        targetQuestions: 100,
        difficultyDistribution: { easy: 40, medium: 40, hard: 20 }
      },
      {
        id: 'probability-basics',
        name: 'Probability Basics',
        description: 'Basic probability concepts and calculations',
        targetQuestions: 100,
        difficultyDistribution: { easy: 40, medium: 40, hard: 20 }
      },
      {
        id: 'conditional-probability',
        name: 'Conditional Probability',
        description: 'Conditional probability and independence',
        targetQuestions: 100,
        difficultyDistribution: { easy: 30, medium: 50, hard: 20 }
      },
      {
        id: 'data-analysis-interpretation',
        name: 'Data Analysis and Interpretation',
        description: 'Analyzing graphs, charts, and data sets',
        targetQuestions: 100,
        difficultyDistribution: { easy: 40, medium: 40, hard: 20 }
      },
      {
        id: 'statistical-inference',
        name: 'Statistical Inference',
        description: 'Drawing conclusions from data and samples',
        targetQuestions: 100,
        difficultyDistribution: { easy: 25, medium: 50, hard: 25 }
      }
    ]
  }
]

// Helper functions
export function getAllSubtopics(): Array<SATSubtopic & { topicId: string; topicName: string; moduleType: 'reading-writing' | 'math' }> {
  return SAT_TOPICS.flatMap(topic => 
    topic.subtopics.map(subtopic => ({
      ...subtopic,
      topicId: topic.id,
      topicName: topic.name,
      moduleType: topic.moduleType
    }))
  )
}

export function getTopicById(id: string): SATTopic | undefined {
  return SAT_TOPICS.find(topic => topic.id === id)
}

export function getSubtopicsByModule(moduleType: 'reading-writing' | 'math'): SATTopic[] {
  return SAT_TOPICS.filter(topic => topic.moduleType === moduleType)
}

export function getTotalTargetQuestions(): number {
  return SAT_TOPICS.reduce((total, topic) => 
    total + topic.subtopics.reduce((subtotal, subtopic) => 
      subtotal + subtopic.targetQuestions, 0), 0)
}

// Summary statistics
export const SAT_TOPICS_SUMMARY = {
  totalTopics: SAT_TOPICS.length,
  totalSubtopics: getAllSubtopics().length,
  totalTargetQuestions: getTotalTargetQuestions(),
  readingWritingSubtopics: getSubtopicsByModule('reading-writing').reduce((count, topic) => count + topic.subtopics.length, 0),
  mathSubtopics: getSubtopicsByModule('math').reduce((count, topic) => count + topic.subtopics.length, 0)
}
