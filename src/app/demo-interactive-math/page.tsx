"use client"

import { useState, useEffect } from 'react'
import InteractiveMathQuestion from '@/components/InteractiveMathQuestion'

// Sample interactive math questions
const sampleQuestions = [
  {
    id: '1',
    question: 'On the coordinate plane, triangle ABC has vertices at A(2, 4), B(-1, 1), and C(3, -2). If you reflect triangle ABC across the y-axis to create triangle A\'B\'C\', what are the coordinates of vertex A\'?',
    options: [
      'A) (-2, 4)',
      'B) (2, -4)', 
      'C) (-2, -4)',
      'D) (4, 2)'
    ],
    correctAnswer: 0,
    explanation: 'When reflecting a point across the y-axis, the x-coordinate changes sign while the y-coordinate stays the same. So A(2, 4) becomes A\'(-2, 4).',
    chartDescription: 'Coordinate plane from -5 to 5 on both axes. Plot triangle ABC with vertices A(2,4), B(-1,1), C(3,-2). Show reflection across y-axis. Interactive: Click to place the reflected vertices A\', B\', C\'.',
    interactionType: 'point-placement',
    graphType: 'coordinate-plane',
    points: 2,
    subtopic: 'Coordinate Geometry',
    category: 'Geometry and Trigonometry'
  },
  {
    id: '2',
    question: 'The function f(x) = (x - 3)² - 4 is graphed below. Click on the vertex of this parabola.',
    options: [
      'A) (3, -4)',
      'B) (-3, 4)',
      'C) (3, 4)',
      'D) (-3, -4)'
    ],
    correctAnswer: 0,
    explanation: 'For a function in vertex form f(x) = a(x - h)² + k, the vertex is at (h, k). Here, h = 3 and k = -4, so the vertex is (3, -4).',
    chartDescription: 'Function graph from -2 to 8 on x-axis, -8 to 4 on y-axis. Show parabola f(x) = (x-3)²-4 opening upward with vertex at (3,-4). Interactive: Select the vertex point.',
    interactionType: 'point-selection',
    graphType: 'function-graph',
    points: 2,
    subtopic: 'Quadratic Functions and Equations',
    category: 'Algebra',
    requiresPointSelection: true
  },
  {
    id: '3',
    question: 'In the unit circle shown, click on the point that corresponds to an angle of 60° (or π/3 radians).',
    options: [
      'A) (1/2, √3/2)',
      'B) (√3/2, 1/2)',
      'C) (√2/2, √2/2)',
      'D) (0, 1)'
    ],
    correctAnswer: 0,
    explanation: 'At 60° on the unit circle, cos(60°) = 1/2 and sin(60°) = √3/2, so the coordinates are (1/2, √3/2).',
    chartDescription: 'Unit circle centered at origin with radius 1. Mark angles at 30°, 45°, 60°, 90° intervals. Interactive: Select the point corresponding to 60°.',
    interactionType: 'point-selection',
    graphType: 'unit-circle',
    points: 3,
    subtopic: 'Trigonometry',
    category: 'Geometry and Trigonometry',
    requiresPointSelection: true
  },
  {
    id: '4',
    question: 'Plot the point where the lines y = 2x + 1 and y = -x + 4 intersect.',
    options: [
      'A) (1, 3)',
      'B) (2, 5)',
      'C) (3, 1)',
      'D) (0, 4)'
    ],
    correctAnswer: 0,
    explanation: 'To find the intersection, set the equations equal: 2x + 1 = -x + 4. Solving: 3x = 3, so x = 1. Substituting back: y = 2(1) + 1 = 3. The intersection point is (1, 3).',
    chartDescription: 'Coordinate plane from -2 to 6 on both axes. Show lines y = 2x + 1 and y = -x + 4. Interactive: Click to place the intersection point (snaps to whole numbers).',
    interactionType: 'point-placement',
    graphType: 'coordinate-plane',
    points: 3,
    subtopic: 'Systems of Equations',
    category: 'Algebra'
  }
]

export default function DemoInteractiveMath() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [userAnswers, setUserAnswers] = useState<number[]>([])
  const [graphInteractions, setGraphInteractions] = useState<Array<{ x: number; y: number; userPoints?: Array<{ x: number; y: number }> } | null>>([])

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...userAnswers]
    newAnswers[currentQuestion] = answerIndex
    setUserAnswers(newAnswers)
  }

  const handleGraphInteraction = (data: Record<string, unknown>) => {
    const newInteractions = [...graphInteractions]
    // Convert Record<string, unknown> to the expected type
    newInteractions[currentQuestion] = {
      x: typeof data.x === 'number' ? data.x : 0,
      y: typeof data.y === 'number' ? data.y : 0,
      userPoints: Array.isArray(data.userPoints) ? data.userPoints as Array<{ x: number; y: number }> : undefined
    }
    setGraphInteractions(newInteractions)
  }

  const nextQuestion = () => {
    if (currentQuestion < sampleQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setShowAnswer(false)
    }
  }

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
      setShowAnswer(false)
    }
  }

  const toggleAnswer = () => {
    setShowAnswer(!showAnswer)
  }

  const resetDemo = () => {
    setCurrentQuestion(0)
    setShowAnswer(false)
    setUserAnswers([])
    setGraphInteractions([])
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Interactive SAT Math Questions Demo
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Experience math questions with interactive graphs and charts
          </p>
          
          {/* Progress */}
          <div className="flex justify-center items-center space-x-4 mb-6">
            <span className="text-sm text-gray-600">
              Question {currentQuestion + 1} of {sampleQuestions.length}
            </span>
            <div className="flex space-x-2">
              {sampleQuestions.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full ${
                    index === currentQuestion
                      ? 'bg-blue-600'
                      : index < currentQuestion
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Question */}
        <InteractiveMathQuestion
          question={sampleQuestions[currentQuestion]}
          onAnswerSelect={handleAnswerSelect}
          onGraphInteraction={handleGraphInteraction}
          showAnswer={showAnswer}
        />

        {/* Controls */}
        <div className="mt-8 flex justify-center space-x-4">
          <button
            onClick={prevQuestion}
            disabled={currentQuestion === 0}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          <button
            onClick={toggleAnswer}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            {showAnswer ? 'Hide Answer' : 'Show Answer'}
          </button>
          
          <button
            onClick={nextQuestion}
            disabled={currentQuestion === sampleQuestions.length - 1}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>

        {/* Demo Controls */}
        <div className="mt-8 text-center">
          <button
            onClick={resetDemo}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Reset Demo
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-12 bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">How to Use Interactive Graphs</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Point Placement</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• Click anywhere on the graph to place a point</li>
                <li>• Points snap to whole number coordinates</li>
                <li>• Multiple points can be placed (up to limit)</li>
                <li>• Use &ldquo;Clear Points&rdquo; to start over</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Point Selection</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• Click on existing points to select them</li>
                <li>• Selected point turns yellow</li>
                <li>• Click &ldquo;Done&rdquo; to confirm your selection</li>
                <li>• Used for identifying specific points</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Point Dragging</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• Drag existing points to move them</li>
                <li>• Useful for geometry transformations</li>
                <li>• Real-time coordinate updates</li>
                <li>• Snaps to whole numbers</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Question Types in Demo:</h4>
            <ul className="text-blue-700 space-y-1">
              <li>• <strong>Question 1:</strong> Point Placement - Place reflected triangle vertices</li>
              <li>• <strong>Question 2:</strong> Point Selection - Click on the parabola vertex</li>
              <li>• <strong>Question 3:</strong> Point Selection - Click on the 60° point on unit circle</li>
              <li>• <strong>Question 4:</strong> Point Placement - Plot line intersection point</li>
            </ul>
          </div>
        </div>

        {/* Results Summary */}
        {userAnswers.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Your Progress</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {sampleQuestions.map((question, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">Question {index + 1}</span>
                    {userAnswers[index] !== undefined && (
                      <span className={`px-2 py-1 rounded text-sm ${
                        userAnswers[index] === question.correctAnswer
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {userAnswers[index] === question.correctAnswer ? 'Correct' : 'Incorrect'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{question.subtopic}</p>
                  {graphInteractions[index]?.userPoints && graphInteractions[index]!.userPoints!.length > 0 && (
                    <p className="text-xs text-blue-600 mt-1">
                      Graph interactions: {graphInteractions[index]!.userPoints!.length} points
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
