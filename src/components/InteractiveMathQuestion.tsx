"use client"

import React, { useState, useEffect } from 'react'
import InteractiveGraph, { GraphPoint } from './InteractiveGraph'
import { GraphGeneratorService } from '@/services/graphGenerator'
import type { GraphData } from '@/services/graphGenerator'
import MathRenderer, { MathEquation, InlineMathRenderer } from './MathRenderer'

interface InteractiveMathQuestionProps {
  question: {
    id?: string
    question: string
    passage?: string
    options: string[]
    correctAnswer: number
    explanation: string
    chartDescription?: string
    interactionType?: string
    graphType?: string
    points: number
    subtopic: string
    category: string
    moduleType?: string
    requiresPointSelection?: boolean // New: indicates if question requires selecting a point
  }
  onAnswerSelect?: (answerIndex: number) => void
  onGraphInteraction?: (data: Record<string, unknown>) => void
  showAnswer?: boolean
}

export default function InteractiveMathQuestion({
  question,
  onAnswerSelect,
  onGraphInteraction,
  showAnswer = false
}: InteractiveMathQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [userPoints, setUserPoints] = useState<GraphPoint[]>([])
  const [selectedPoint, setSelectedPoint] = useState<GraphPoint | null>(null)
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [selectionConfirmed, setSelectionConfirmed] = useState(false)

  useEffect(() => {
    if (question.chartDescription) {
      const generatedGraph = GraphGeneratorService.generateGraphFromDescription(
        question.chartDescription,
        question.subtopic
      )
      setGraphData(generatedGraph)
    }
  }, [question.chartDescription, question.subtopic])

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex)
    onAnswerSelect?.(answerIndex)
  }

  const handleUserPointsChange = (points: GraphPoint[]) => {
    setUserPoints(points)
    onGraphInteraction?.({ userPoints: points })
  }

  const handlePointSelect = (point: GraphPoint | null) => {
    setSelectedPoint(point)
    setSelectionConfirmed(false)
    onGraphInteraction?.({ selectedPoint: point })
  }

  const handleSelectionDone = () => {
    if (selectedPoint) {
      setSelectionConfirmed(true)
      onGraphInteraction?.({ 
        selectedPoint: selectedPoint,
        confirmed: true 
      })
    }
  }

  const clearUserPoints = () => {
    setUserPoints([])
    setSelectedPoint(null)
    setSelectionConfirmed(false)
    onGraphInteraction?.({ userPoints: [], selectedPoint: null })
  }

  const isSelectionMode = question.requiresPointSelection || 
    (question.interactionType === 'point-selection') ||
    (question.chartDescription ? question.chartDescription.toLowerCase().includes('select') : false)

  const maxPoints = question.interactionType === 'single-point' ? 1 : 10

  const getAnswerStyle = (index: number) => {
    if (!showAnswer && selectedAnswer === null) {
      return 'bg-gray-50 hover:bg-gray-100 border-gray-200'
    }
    
    if (showAnswer) {
      if (index === question.correctAnswer) {
        return 'bg-green-100 border-green-300 text-green-800'
      }
      if (selectedAnswer === index && index !== question.correctAnswer) {
        return 'bg-red-100 border-red-300 text-red-800'
      }
    } else if (selectedAnswer === index) {
      return 'bg-blue-100 border-blue-300 text-blue-800'
    }
    
    return 'bg-gray-50 hover:bg-gray-100 border-gray-200'
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      {/* Question Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {question.category}
            </span>
            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
              {question.subtopic}
            </span>
            <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
              {question.points} point{question.points !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          <MathRenderer>{question.question}</MathRenderer>
        </h2>
      </div>

      {/* Reading Passage (for reading questions) */}
      {question.passage && (
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 shadow-sm">
          <div className="flex items-center mb-4">
            <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold mr-3">
              📖 Reading Passage
            </span>
            <span className="text-blue-700 text-sm font-medium">
              Read carefully before answering
            </span>
          </div>
          <div className="prose prose-lg max-w-none">
            <div className="text-gray-800 leading-relaxed font-medium bg-white p-4 rounded-lg border border-blue-100">
              <MathRenderer>{question.passage}</MathRenderer>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Graph */}
      {graphData && (
        <div className="mb-6">
          <InteractiveGraph
            config={graphData.config}
            points={graphData.points}
            lines={graphData.lines}
            functions={graphData.functions}
            allowPointPlacement={!isSelectionMode && (graphData.interactionType === 'point-placement')}
            allowPointDragging={!isSelectionMode && (graphData.interactionType === 'point-dragging')}
            userPoints={userPoints}
            onUserPointsChange={handleUserPointsChange}
            snapToGrid={true}
            selectionMode={isSelectionMode}
            selectedPoint={selectedPoint}
            onPointSelect={handlePointSelect}
            maxPoints={maxPoints}
          />
          
          {/* Graph Controls */}
          <div className="mt-4 flex justify-center space-x-4">
            {!isSelectionMode && (
              <button
                onClick={clearUserPoints}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Clear Points
              </button>
            )}
            
            {isSelectionMode && selectedPoint && !selectionConfirmed && (
              <button
                onClick={handleSelectionDone}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Done - Confirm Selection
              </button>
            )}
            
            {isSelectionMode && (
              <button
                onClick={clearUserPoints}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Clear Selection
              </button>
            )}
          </div>
          
          {/* Status Display */}
          <div className="mt-4 text-center">
            {!isSelectionMode && userPoints.length > 0 && (
              <div className="flex justify-center items-center space-x-2 text-sm text-gray-600">
                <span>Points placed:</span>
                {userPoints.map((point, index) => (
                  <span key={index} className="bg-blue-100 px-2 py-1 rounded">
                    <InlineMathRenderer>{`(${point.x}, ${point.y})`}</InlineMathRenderer>
                  </span>
                ))}
              </div>
            )}
            
            {isSelectionMode && selectedPoint && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">
                  {selectionConfirmed ? (
                    <span className="font-semibold">
                      ✓ Selection Confirmed: <InlineMathRenderer>{`(${selectedPoint.x}, ${selectedPoint.y})`}</InlineMathRenderer>
                    </span>
                  ) : (
                    <span>
                      Selected: <InlineMathRenderer>{`(${selectedPoint.x}, ${selectedPoint.y})`}</InlineMathRenderer> - Click &ldquo;Done&rdquo; to confirm
                    </span>
                  )}
                </p>
              </div>
            )}
            
            {isSelectionMode && !selectedPoint && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800">Click on a point in the graph to select your answer</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chart Description (if no interactive graph) */}
      {question.chartDescription && !graphData && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">Graph/Chart:</h4>
          <p className="text-blue-700">
            <MathRenderer>{question.chartDescription}</MathRenderer>
          </p>
        </div>
      )}

      {/* Answer Options */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-900 mb-3">Choose the best answer:</h4>
        <div className="space-y-3">
          {question.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(index)}
              disabled={showAnswer}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${getAnswerStyle(index)}`}
            >
              <div className="flex items-start">
                <span className="font-semibold mr-3">
                  {String.fromCharCode(65 + index)}.
                </span>
                <span>
                  <MathRenderer>{option}</MathRenderer>
                </span>
                {showAnswer && index === question.correctAnswer && (
                  <span className="ml-auto text-green-600 font-bold">✓</span>
                )}
                {showAnswer && selectedAnswer === index && index !== question.correctAnswer && (
                  <span className="ml-auto text-red-600 font-bold">✗</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Explanation (shown when answer is revealed) */}
      {showAnswer && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-800 mb-2">Explanation:</h4>
          <p className="text-green-700">
            <MathRenderer>{question.explanation}</MathRenderer>
          </p>
          
          {/* Graph interaction feedback */}
          {isSelectionMode && selectedPoint && (
            <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
              <h5 className="font-semibold text-blue-800 mb-1">Your Selection:</h5>
              <p className="text-blue-700 text-sm">
                You selected point: <InlineMathRenderer>{`(${selectedPoint.x}, ${selectedPoint.y})`}</InlineMathRenderer>
                {selectionConfirmed && <span className="text-green-600 font-semibold"> ✓ Confirmed</span>}
              </p>
            </div>
          )}
          
          {!isSelectionMode && userPoints.length > 0 && (
            <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
              <h5 className="font-semibold text-blue-800 mb-1">Your Graph Interactions:</h5>
              <p className="text-blue-700 text-sm">
                You placed {userPoints.length} point{userPoints.length !== 1 ? 's' : ''}: {' '}
                {userPoints.map((p, i) => (
                  <span key={i}>
                    <InlineMathRenderer>{`(${p.x}, ${p.y})`}</InlineMathRenderer>
                    {i < userPoints.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Answer Status */}
      {selectedAnswer !== null && !showAnswer && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-blue-800">
            You selected: <strong>{String.fromCharCode(65 + selectedAnswer)}) <MathRenderer>{question.options[selectedAnswer]}</MathRenderer></strong>
          </p>
        </div>
      )}
    </div>
  )
}
