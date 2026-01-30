"use client"

import React, { useState, useRef, useCallback } from 'react'

export interface GraphPoint {
  x: number
  y: number
  label?: string
  color?: string
  draggable?: boolean
}

export interface GraphLine {
  points: GraphPoint[]
  color?: string
  strokeWidth?: number
  dashed?: boolean
}

export interface GraphFunction {
  equation: string
  color?: string
  domain?: [number, number]
}

export interface GraphConfig {
  width: number
  height: number
  xMin: number
  xMax: number
  yMin: number
  yMax: number
  gridSize: number
  showGrid: boolean
  showAxes: boolean
  title?: string
  xLabel?: string
  yLabel?: string
}

export interface InteractiveGraphProps {
  config: GraphConfig
  points?: GraphPoint[]
  lines?: GraphLine[]
  functions?: GraphFunction[]
  onPointClick?: (point: GraphPoint) => void
  onPointDrag?: (point: GraphPoint, newPosition: GraphPoint) => void
  allowPointPlacement?: boolean
  allowPointDragging?: boolean
  userPoints?: GraphPoint[]
  onUserPointsChange?: (points: GraphPoint[]) => void
  snapToGrid?: boolean
  selectionMode?: boolean // New: for selecting existing points as answers
  selectedPoint?: GraphPoint | null
  onPointSelect?: (point: GraphPoint | null) => void
  maxPoints?: number // Limit number of points that can be placed
}

export default function InteractiveGraph({
  config,
  points = [],
  lines = [],
  functions = [],
  onPointClick,
  onPointDrag,
  allowPointPlacement = false,
  allowPointDragging = false,
  userPoints = [],
  onUserPointsChange,
  snapToGrid = true,
  selectionMode = false,
  selectedPoint = null,
  onPointSelect,
  maxPoints = 10
}: InteractiveGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [draggedPoint, setDraggedPoint] = useState<GraphPoint | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  // Convert graph coordinates to SVG coordinates
  const graphToSVG = useCallback((x: number, y: number) => {
    const svgX = ((x - config.xMin) / (config.xMax - config.xMin)) * config.width
    const svgY = config.height - ((y - config.yMin) / (config.yMax - config.yMin)) * config.height
    return { x: svgX, y: svgY }
  }, [config])

  // Convert SVG coordinates to graph coordinates with optional snapping
  const svgToGraph = useCallback((x: number, y: number) => {
    const graphX = (x / config.width) * (config.xMax - config.xMin) + config.xMin
    const graphY = ((config.height - y) / config.height) * (config.yMax - config.yMin) + config.yMin
    
    if (snapToGrid) {
      // Snap to whole numbers
      return { 
        x: Math.round(graphX), 
        y: Math.round(graphY) 
      }
    } else {
      // Keep one decimal place
      return { 
        x: Math.round(graphX * 10) / 10, 
        y: Math.round(graphY * 10) / 10 
      }
    }
  }, [config, snapToGrid])

  // Handle SVG click for point placement or selection
  const handleSVGClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (selectionMode) return // Don't place points in selection mode
    if (!allowPointPlacement) return
    if (userPoints.length >= maxPoints) return

    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return

    const svgX = event.clientX - rect.left
    const svgY = event.clientY - rect.top
    const graphCoords = svgToGraph(svgX, svgY)

    // Check if point already exists at this location
    const existingPoint = userPoints.find(p => p.x === graphCoords.x && p.y === graphCoords.y)
    if (existingPoint) return

    const newPoint: GraphPoint = {
      x: graphCoords.x,
      y: graphCoords.y,
      color: '#3b82f6',
      draggable: allowPointDragging
    }

    const newUserPoints = [...userPoints, newPoint]
    onUserPointsChange?.(newUserPoints)
  }

  // Handle point click for selection mode
  const handlePointClick = (point: GraphPoint, isUserPoint = false) => {
    if (selectionMode) {
      // In selection mode, select the clicked point
      onPointSelect?.(point)
      return
    }

    // Regular point click behavior
    onPointClick?.(point)
  }

  // Handle point drag start
  const handlePointMouseDown = (point: GraphPoint, event: React.MouseEvent) => {
    if (selectionMode) return // No dragging in selection mode
    if (!allowPointDragging || !point.draggable) return

    event.stopPropagation()
    setDraggedPoint(point)

    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return

    const svgCoords = graphToSVG(point.x, point.y)
    setDragOffset({
      x: event.clientX - rect.left - svgCoords.x,
      y: event.clientY - rect.top - svgCoords.y
    })
  }

  // Handle mouse move for dragging
  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!draggedPoint || selectionMode) return

    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return

    const svgX = event.clientX - rect.left - dragOffset.x
    const svgY = event.clientY - rect.top - dragOffset.y
    const graphCoords = svgToGraph(svgX, svgY)

    const updatedPoint = { ...draggedPoint, x: graphCoords.x, y: graphCoords.y }
    
    // Update user points
    const updatedUserPoints = userPoints.map(p => 
      p === draggedPoint ? updatedPoint : p
    )
    onUserPointsChange?.(updatedUserPoints)
    onPointDrag?.(draggedPoint, updatedPoint)
  }

  // Handle mouse up to end dragging
  const handleMouseUp = () => {
    setDraggedPoint(null)
    setDragOffset({ x: 0, y: 0 })
  }

  // Generate grid lines
  const generateGridLines = () => {
    const lines = []
    
    // Vertical grid lines
    for (let x = config.xMin; x <= config.xMax; x += config.gridSize) {
      const svgStart = graphToSVG(x, config.yMin)
      const svgEnd = graphToSVG(x, config.yMax)
      lines.push(
        <line
          key={`vgrid-${x}`}
          x1={svgStart.x}
          y1={svgStart.y}
          x2={svgEnd.x}
          y2={svgEnd.y}
          stroke="#e5e7eb"
          strokeWidth="1"
        />
      )
    }

    // Horizontal grid lines
    for (let y = config.yMin; y <= config.yMax; y += config.gridSize) {
      const svgStart = graphToSVG(config.xMin, y)
      const svgEnd = graphToSVG(config.xMax, y)
      lines.push(
        <line
          key={`hgrid-${y}`}
          x1={svgStart.x}
          y1={svgStart.y}
          x2={svgEnd.x}
          y2={svgEnd.y}
          stroke="#e5e7eb"
          strokeWidth="1"
        />
      )
    }

    return lines
  }

  // Generate axes
  const generateAxes = () => {
    const axes = []
    
    // X-axis
    const xAxisStart = graphToSVG(config.xMin, 0)
    const xAxisEnd = graphToSVG(config.xMax, 0)
    axes.push(
      <line
        key="x-axis"
        x1={xAxisStart.x}
        y1={xAxisStart.y}
        x2={xAxisEnd.x}
        y2={xAxisEnd.y}
        stroke="#374151"
        strokeWidth="2"
      />
    )

    // Y-axis
    const yAxisStart = graphToSVG(0, config.yMin)
    const yAxisEnd = graphToSVG(0, config.yMax)
    axes.push(
      <line
        key="y-axis"
        x1={yAxisStart.x}
        y1={yAxisStart.y}
        x2={yAxisEnd.x}
        y2={yAxisEnd.y}
        stroke="#374151"
        strokeWidth="2"
      />
    )

    return axes
  }

  // Generate axis labels
  const generateAxisLabels = () => {
    const labels = []
    
    // X-axis labels
    for (let x = config.xMin; x <= config.xMax; x += config.gridSize) {
      if (x === 0) continue
      const svgPos = graphToSVG(x, 0)
      labels.push(
        <text
          key={`xlabel-${x}`}
          x={svgPos.x}
          y={svgPos.y + 15}
          textAnchor="middle"
          fontSize="12"
          fill="#6b7280"
        >
          {x}
        </text>
      )
    }

    // Y-axis labels
    for (let y = config.yMin; y <= config.yMax; y += config.gridSize) {
      if (y === 0) continue
      const svgPos = graphToSVG(0, y)
      labels.push(
        <text
          key={`ylabel-${y}`}
          x={svgPos.x - 15}
          y={svgPos.y + 4}
          textAnchor="middle"
          fontSize="12"
          fill="#6b7280"
        >
          {y}
        </text>
      )
    }

    return labels
  }

  // Render points
  const renderPoints = (pointList: GraphPoint[], isUserPoints = false) => {
    return pointList.map((point, index) => {
      const svgPos = graphToSVG(point.x, point.y)
      const isSelected = selectedPoint && selectedPoint.x === point.x && selectedPoint.y === point.y
      
      return (
        <g key={`${isUserPoints ? 'user' : 'static'}-point-${index}`}>
          <circle
            cx={svgPos.x}
            cy={svgPos.y}
            r={isSelected ? "10" : "6"}
            fill={isSelected ? '#fbbf24' : (point.color || '#3b82f6')}
            stroke={isSelected ? '#f59e0b' : "#ffffff"}
            strokeWidth={isSelected ? "3" : "2"}
            style={{ 
              cursor: selectionMode ? 'pointer' : (point.draggable ? 'grab' : 'pointer'),
              transition: 'all 0.2s ease'
            }}
            onMouseDown={(e) => handlePointMouseDown(point, e)}
            onClick={() => handlePointClick(point, isUserPoints)}
          />
          {point.label && (
            <text
              x={svgPos.x}
              y={svgPos.y - (isSelected ? 15 : 10)}
              textAnchor="middle"
              fontSize="12"
              fill="#374151"
              fontWeight="bold"
            >
              {point.label}
            </text>
          )}
          {isSelected && (
            <text
              x={svgPos.x}
              y={svgPos.y + 25}
              textAnchor="middle"
              fontSize="10"
              fill="#f59e0b"
              fontWeight="bold"
            >
              SELECTED
            </text>
          )}
        </g>
      )
    })
  }

  // Render lines
  const renderLines = () => {
    return lines.map((line, index) => {
      const pathData = line.points.map((point, i) => {
        const svgPos = graphToSVG(point.x, point.y)
        return `${i === 0 ? 'M' : 'L'} ${svgPos.x} ${svgPos.y}`
      }).join(' ')

      return (
        <path
          key={`line-${index}`}
          d={pathData}
          stroke={line.color || '#3b82f6'}
          strokeWidth={line.strokeWidth || 2}
          strokeDasharray={line.dashed ? '5,5' : undefined}
          fill="none"
        />
      )
    })
  }

  return (
    <div className="bg-white border rounded-lg p-4">
      {config.title && (
        <h3 className="text-lg font-semibold text-center mb-4">{config.title}</h3>
      )}
      
      <div className="flex justify-center">
        <svg
          ref={svgRef}
          width={config.width}
          height={config.height}
          className="border border-gray-300"
          onClick={handleSVGClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Grid */}
          {config.showGrid && generateGridLines()}
          
          {/* Axes */}
          {config.showAxes && generateAxes()}
          
          {/* Axis labels */}
          {config.showAxes && generateAxisLabels()}
          
          {/* Lines */}
          {renderLines()}
          
          {/* Static points */}
          {renderPoints(points)}
          
          {/* User points */}
          {renderPoints(userPoints, true)}
        </svg>
      </div>

      {/* Instructions */}
      <div className="mt-4 text-sm text-gray-600">
        {selectionMode ? (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="font-semibold text-yellow-800">Selection Mode:</p>
            <p className="text-yellow-700">• Click on a point to select it as your answer</p>
            <p className="text-yellow-700">• Selected point will be highlighted in yellow</p>
            <p className="text-yellow-700">• Click &ldquo;Done&rdquo; when you&apos;ve made your selection</p>
          </div>
        ) : (
          <>
            {allowPointPlacement && (
              <p>• Click anywhere on the graph to place a point {snapToGrid ? '(snaps to whole numbers)' : ''}</p>
            )}
            {allowPointDragging && (
              <p>• Drag points to move them {snapToGrid ? '(snaps to whole numbers)' : ''}</p>
            )}
            {maxPoints && userPoints.length >= maxPoints && (
              <p className="text-orange-600 font-semibold">• Maximum {maxPoints} points reached</p>
            )}
          </>
        )}
        
        {userPoints.length > 0 && !selectionMode && (
          <div className="mt-2">
            <p className="font-semibold">Your points ({userPoints.length}/{maxPoints}):</p>
            {userPoints.map((point, index) => (
              <span key={index} className="inline-block mr-3">
                ({point.x}, {point.y})
              </span>
            ))}
          </div>
        )}
        
        {selectedPoint && selectionMode && (
          <div className="mt-2 p-2 bg-yellow-100 rounded">
            <p className="font-semibold text-yellow-800">Selected Point: ({selectedPoint.x}, {selectedPoint.y})</p>
          </div>
        )}
      </div>
    </div>
  )
}
