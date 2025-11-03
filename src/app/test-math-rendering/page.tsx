"use client"

import React from 'react'
import MathRenderer, { MathEquation, InlineMathRenderer } from '@/components/MathRenderer'

export default function TestMathRendering() {
  const sampleQuestions = [
    {
      question: "A quadratic function f(x) = ax^2 + bx + c has vertex at (2, -3) and passes through point (0, 1). What is the value of a?",
      options: [
        "A) a = 1",
        "B) a = 2", 
        "C) a = -1",
        "D) a = 1/2"
      ],
      explanation: "Using vertex form f(x) = a(x - h)^2 + k with vertex (2, -3): f(x) = a(x - 2)^2 - 3. Since f(0) = 1: 1 = a(0 - 2)^2 - 3 → 1 = 4a - 3 → 4a = 4 → a = 1"
    },
    {
      question: "Solve the system of equations: 2x + 3y = 12 and x - y = 1. What is the value of x + y?",
      options: [
        "A) x + y = 3",
        "B) x + y = 4", 
        "C) x + y = 5",
        "D) x + y = 6"
      ],
      explanation: "From x - y = 1, we get x = y + 1. Substituting into 2x + 3y = 12: 2(y + 1) + 3y = 12 → 2y + 2 + 3y = 12 → 5y = 10 → y = 2. Then x = 2 + 1 = 3. Therefore x + y = 3 + 2 = 5"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Math Equation Rendering Test
        </h1>
        
        <div className="mb-8 p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">Basic Math Expressions</h2>
          <div className="space-y-4">
            <div>
              <strong>Inline Math:</strong> The quadratic formula is <InlineMathRenderer>x = (-b ± sqrt(b^2 - 4ac)) / 2a</InlineMathRenderer>
            </div>
            <div>
              <strong>Block Math:</strong>
              <MathEquation>f(x) = ax^2 + bx + c</MathEquation>
            </div>
            <div>
              <strong>Fractions:</strong> <InlineMathRenderer>1/2 + 3/4 = 5/4</InlineMathRenderer>
            </div>
            <div>
              <strong>Coordinates:</strong> The vertex is at <InlineMathRenderer>(2, -3)</InlineMathRenderer>
            </div>
          </div>
        </div>

        {sampleQuestions.map((q, index) => (
          <div key={index} className="mb-8 p-6 bg-white rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Sample Question {index + 1}</h3>
            
            <div className="mb-4">
              <strong>Question:</strong>
              <div className="mt-2">
                <MathRenderer>{q.question}</MathRenderer>
              </div>
            </div>

            <div className="mb-4">
              <strong>Options:</strong>
              <div className="mt-2 space-y-2">
                {q.options.map((option, optIndex) => (
                  <div key={optIndex} className="p-2 bg-gray-50 rounded">
                    <MathRenderer>{option}</MathRenderer>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <strong>Explanation:</strong>
              <div className="mt-2 p-3 bg-green-50 rounded">
                <MathRenderer>{q.explanation}</MathRenderer>
              </div>
            </div>
          </div>
        ))}

        <div className="mt-8 p-6 bg-blue-50 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Features Demonstrated</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Automatic detection of mathematical expressions</li>
            <li>Proper rendering of equations, fractions, and exponents</li>
            <li>Support for coordinate points and function notation</li>
            <li>Inline and block math rendering</li>
            <li>Fallback to monospace font if LaTeX parsing fails</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
