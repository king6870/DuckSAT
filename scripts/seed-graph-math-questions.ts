import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const GRAPH_MATH_QUESTIONS = [
  // Linear Functions
  {
    question: "Based on the graph shown, what is the slope of the line?",
    options: ["A) 2", "B) 1/2", "C) -2", "D) -1/2"],
    correctAnswer: 0,
    explanation: "The line passes through points (0,0) and (1,2), so slope = (2-0)/(1-0) = 2",
    difficulty: "easy",
    category: "Linear Functions and Graphs",
    chartData: {
      type: "line",
      title: "Linear Function",
      xAxis: "x",
      yAxis: "y",
      data: [{"x": 0, "y": 0}, {"x": 1, "y": 2}, {"x": 2, "y": 4}]
    }
  },
  {
    question: "What is the y-intercept of the function shown in the graph?",
    options: ["A) 3", "B) -3", "C) 0", "D) 1"],
    correctAnswer: 1,
    explanation: "The line crosses the y-axis at y = -3",
    difficulty: "easy",
    category: "Linear Functions and Graphs",
    chartData: {
      type: "line",
      title: "Linear Function with Y-intercept",
      xAxis: "x",
      yAxis: "y",
      data: [{"x": 0, "y": -3}, {"x": 1, "y": -1}, {"x": 2, "y": 1}]
    }
  },
  // Quadratic Functions
  {
    question: "Based on the parabola shown, what is the vertex of the function?",
    options: ["A) (2, -4)", "B) (-2, 4)", "C) (2, 4)", "D) (-2, -4)"],
    correctAnswer: 0,
    explanation: "The vertex is the lowest point of the parabola at coordinates (2, -4)",
    difficulty: "medium",
    category: "Quadratic Functions and Parabolas",
    chartData: {
      type: "function",
      title: "Quadratic Function",
      xAxis: "x",
      yAxis: "y",
      data: [{"x": 0, "y": 0}, {"x": 1, "y": -3}, {"x": 2, "y": -4}, {"x": 3, "y": -3}, {"x": 4, "y": 0}]
    }
  },
  {
    question: "What are the x-intercepts of the quadratic function shown?",
    options: ["A) x = 1 and x = 3", "B) x = -1 and x = 3", "C) x = 0 and x = 4", "D) x = 2 only"],
    correctAnswer: 0,
    explanation: "The parabola crosses the x-axis at x = 1 and x = 3",
    difficulty: "medium",
    category: "Quadratic Functions and Parabolas",
    chartData: {
      type: "function",
      title: "Quadratic with X-intercepts",
      xAxis: "x",
      yAxis: "y",
      data: [{"x": 0, "y": 3}, {"x": 1, "y": 0}, {"x": 2, "y": -1}, {"x": 3, "y": 0}, {"x": 4, "y": 3}]
    }
  },
  // Exponential Functions
  {
    question: "Based on the exponential function shown, what is the horizontal asymptote?",
    options: ["A) y = 0", "B) y = 1", "C) y = 2", "D) x = 0"],
    correctAnswer: 0,
    explanation: "As x approaches negative infinity, the function approaches y = 0",
    difficulty: "medium",
    category: "Exponential and Logarithmic Functions",
    chartData: {
      type: "function",
      title: "Exponential Function",
      xAxis: "x",
      yAxis: "y",
      data: [{"x": -2, "y": 0.25}, {"x": -1, "y": 0.5}, {"x": 0, "y": 1}, {"x": 1, "y": 2}, {"x": 2, "y": 4}]
    }
  },
  // Statistics and Data Analysis
  {
    question: "Based on the scatter plot, what type of correlation exists between x and y?",
    options: ["A) Strong positive", "B) Strong negative", "C) Weak positive", "D) No correlation"],
    correctAnswer: 0,
    explanation: "The points show a clear upward trend indicating strong positive correlation",
    difficulty: "easy",
    category: "Statistics and Data Analysis",
    chartData: {
      type: "scatter",
      title: "Scatter Plot Analysis",
      xAxis: "Variable X",
      yAxis: "Variable Y",
      data: [{"x": 1, "y": 2}, {"x": 2, "y": 4}, {"x": 3, "y": 5}, {"x": 4, "y": 7}, {"x": 5, "y": 9}]
    }
  },
  {
    question: "What is the median value shown in this box plot?",
    options: ["A) 15", "B) 20", "C) 25", "D) 30"],
    correctAnswer: 1,
    explanation: "The median is represented by the middle line in the box at value 20",
    difficulty: "easy",
    category: "Statistics and Data Analysis",
    chartData: {
      type: "box",
      title: "Box Plot",
      xAxis: "Data Set",
      yAxis: "Values",
      data: {"min": 10, "q1": 15, "median": 20, "q3": 25, "max": 30}
    }
  },
  // Coordinate Geometry
  {
    question: "What is the distance between points A and B on the coordinate plane?",
    options: ["A) 5", "B) 7", "C) √41", "D) √65"],
    correctAnswer: 2,
    explanation: "Using distance formula: √[(5-1)² + (4-(-1))²] = √[16 + 25] = √41",
    difficulty: "hard",
    category: "Coordinate Geometry",
    chartData: {
      type: "scatter",
      title: "Coordinate Plane",
      xAxis: "x",
      yAxis: "y",
      data: [{"x": 1, "y": -1, "label": "A"}, {"x": 5, "y": 4, "label": "B"}]
    }
  },
  // Systems of Equations
  {
    question: "At what point do the two lines intersect?",
    options: ["A) (2, 3)", "B) (3, 2)", "C) (1, 4)", "D) (4, 1)"],
    correctAnswer: 0,
    explanation: "The two lines intersect at the point (2, 3)",
    difficulty: "medium",
    category: "Systems of Equations (Graphical)",
    chartData: {
      type: "line",
      title: "System of Linear Equations",
      xAxis: "x",
      yAxis: "y",
      data: [
        {"x": 0, "y": -1, "line": 1}, {"x": 2, "y": 3, "line": 1}, {"x": 4, "y": 7, "line": 1},
        {"x": 0, "y": 5, "line": 2}, {"x": 2, "y": 3, "line": 2}, {"x": 4, "y": 1, "line": 2}
      ]
    }
  },
  // More Linear Functions
  {
    question: "Which equation represents the line shown in the graph?",
    options: ["A) y = 3x + 1", "B) y = -3x + 1", "C) y = 1/3x + 1", "D) y = -1/3x + 1"],
    correctAnswer: 1,
    explanation: "The line has slope -3 and y-intercept 1, so y = -3x + 1",
    difficulty: "medium",
    category: "Linear Functions and Graphs",
    chartData: {
      type: "line",
      title: "Linear Function",
      xAxis: "x",
      yAxis: "y",
      data: [{"x": 0, "y": 1}, {"x": 1, "y": -2}, {"x": 2, "y": -5}]
    }
  },
  {
    question: "Based on the graph, what is the range of the function?",
    options: ["A) All real numbers", "B) y ≥ 0", "C) y ≤ 4", "D) 0 ≤ y ≤ 4"],
    correctAnswer: 2,
    explanation: "The parabola opens downward with maximum value of 4, so y ≤ 4",
    difficulty: "hard",
    category: "Quadratic Functions and Parabolas",
    chartData: {
      type: "function",
      title: "Quadratic Function - Range",
      xAxis: "x",
      yAxis: "y",
      data: [{"x": -2, "y": 0}, {"x": -1, "y": 3}, {"x": 0, "y": 4}, {"x": 1, "y": 3}, {"x": 2, "y": 0}]
    }
  }
]

async function seedGraphMathQuestions() {
  try {
    console.log('🔢 Seeding graph-only math questions...')
    
    // Delete existing math questions
    await prisma.question.deleteMany({
      where: { moduleType: 'math' }
    })
    
    console.log('🗑️ Deleted existing math questions')
    
    // Add new graph-only questions
    for (const questionData of GRAPH_MATH_QUESTIONS) {
      await prisma.question.create({
        data: {
          moduleType: 'math',
          difficulty: questionData.difficulty as any,
          category: questionData.category,
          subtopic: questionData.category,
          question: questionData.question,
          options: questionData.options,
          correctAnswer: questionData.correctAnswer,
          explanation: questionData.explanation,
          chartData: questionData.chartData,
          timeEstimate: 120, // 2 minutes
          source: 'Curated Graph Questions',
          tags: ['graphs', 'charts', 'coordinate-plane'],
          isActive: true
        }
      })
    }
    
    // Generate more variations
    const variations = []
    for (let i = 0; i < 50; i++) {
      const baseQuestion = GRAPH_MATH_QUESTIONS[i % GRAPH_MATH_QUESTIONS.length]
      variations.push({
        ...baseQuestion,
        question: `${baseQuestion.question} (Variation ${i + 1})`,
        chartData: {
          ...baseQuestion.chartData,
          title: `${baseQuestion.chartData.title} - Variation ${i + 1}`
        }
      })
    }
    
    for (const questionData of variations) {
      await prisma.question.create({
        data: {
          moduleType: 'math',
          difficulty: questionData.difficulty as any,
          category: questionData.category,
          subtopic: questionData.category,
          question: questionData.question,
          options: questionData.options,
          correctAnswer: questionData.correctAnswer,
          explanation: questionData.explanation,
          chartData: questionData.chartData,
          timeEstimate: 120,
          source: 'Curated Graph Questions (Variation)',
          tags: ['graphs', 'charts', 'coordinate-plane'],
          isActive: true
        }
      })
    }
    
    const totalQuestions = await prisma.question.count({
      where: { moduleType: 'math' }
    })
    
    console.log(`✅ Successfully created ${totalQuestions} graph-only math questions!`)
    
  } catch (error) {
    console.error('❌ Error seeding questions:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedGraphMathQuestions()
