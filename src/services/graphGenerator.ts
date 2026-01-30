// Graph Generator Service for Math Questions
import { GraphConfig, GraphPoint, GraphLine, GraphFunction } from '@/components/InteractiveGraph'

export interface GraphData {
  config: GraphConfig
  points?: GraphPoint[]
  lines?: GraphLine[]
  functions?: GraphFunction[]
  interactionType?: 'point-placement' | 'point-dragging' | 'line-drawing' | 'none'
  correctAnswer?: {
    points?: GraphPoint[]
    lines?: GraphLine[]
    tolerance?: number
  }
}

export class GraphGeneratorService {
  /**
   * Generate graph data based on question content and type
   */
  static generateGraphFromDescription(description: string, questionType: string): GraphData {
    // Parse the description to determine graph type
    const graphType = this.determineGraphType(description, questionType)
    
    switch (graphType) {
      case 'coordinate-plane':
        return this.generateCoordinatePlane(description)
      case 'function-graph':
        return this.generateFunctionGraph(description)
      case 'geometry-diagram':
        return this.generateGeometryDiagram(description)
      case 'statistics-chart':
        return this.generateStatisticsChart(description)
      case 'trigonometry-unit-circle':
        return this.generateUnitCircle(description)
      case 'bar-chart':
        return this.generateBarChart(description)
      case 'line-graph':
        return this.generateLineGraph(description)
      case 'pie-chart':
        return this.generatePieChart(description)
      default:
        return this.generateDefaultGraph()
    }
  }

  /**
   * Determine graph type from description
   */
  private static determineGraphType(description: string, questionType: string): string {
    const desc = description.toLowerCase()
    
    if (desc.includes('coordinate') || desc.includes('point') || desc.includes('line')) {
      return 'coordinate-plane'
    }
    if (desc.includes('function') || desc.includes('parabola') || desc.includes('equation')) {
      return 'function-graph'
    }
    if (desc.includes('triangle') || desc.includes('circle') || desc.includes('polygon')) {
      return 'geometry-diagram'
    }
    if (desc.includes('bar chart') || desc.includes('bar graph') || desc.includes('histogram')) {
      return 'bar-chart'
    }
    if (desc.includes('line chart') || desc.includes('line graph') || desc.includes('trend')) {
      return 'line-graph'
    }
    if (desc.includes('pie chart') || desc.includes('pie graph') || desc.includes('percentage')) {
      return 'pie-chart'
    }
    if (desc.includes('data') || desc.includes('scatter') || desc.includes('statistics')) {
      return 'statistics-chart'
    }
    if (desc.includes('trigonometry') || desc.includes('unit circle') || desc.includes('sin') || desc.includes('cos')) {
      return 'trigonometry-unit-circle'
    }
    
    return 'coordinate-plane'
  }

  /**
   * Generate coordinate plane graph
   */
  private static generateCoordinatePlane(description: string): GraphData {
    return {
      config: {
        width: 400,
        height: 400,
        xMin: -10,
        xMax: 10,
        yMin: -10,
        yMax: 10,
        gridSize: 1,
        showGrid: true,
        showAxes: true,
        title: 'Coordinate Plane',
        xLabel: 'x',
        yLabel: 'y'
      },
      points: this.extractPointsFromDescription(description),
      lines: this.extractLinesFromDescription(description),
      interactionType: 'point-placement'
    }
  }

  /**
   * Generate function graph
   */
  private static generateFunctionGraph(description: string): GraphData {
    const functions = this.extractFunctionsFromDescription(description)
    
    return {
      config: {
        width: 500,
        height: 400,
        xMin: -5,
        xMax: 5,
        yMin: -10,
        yMax: 10,
        gridSize: 1,
        showGrid: true,
        showAxes: true,
        title: 'Function Graph',
        xLabel: 'x',
        yLabel: 'f(x)'
      },
      functions,
      points: this.generateFunctionPoints(functions),
      interactionType: 'point-placement'
    }
  }

  /**
   * Generate geometry diagram
   */
  private static generateGeometryDiagram(description: string): GraphData {
    return {
      config: {
        width: 400,
        height: 400,
        xMin: -8,
        xMax: 8,
        yMin: -8,
        yMax: 8,
        gridSize: 1,
        showGrid: true,
        showAxes: true,
        title: 'Geometry Diagram'
      },
      points: this.extractGeometryPoints(description),
      lines: this.extractGeometryLines(description),
      interactionType: 'point-dragging'
    }
  }

  /**
   * Generate statistics chart
   */
  private static generateStatisticsChart(description: string): GraphData {
    return {
      config: {
        width: 500,
        height: 300,
        xMin: 0,
        xMax: 10,
        yMin: 0,
        yMax: 20,
        gridSize: 1,
        showGrid: true,
        showAxes: true,
        title: 'Data Chart',
        xLabel: 'Category',
        yLabel: 'Value'
      },
      points: this.extractDataPoints(description),
      interactionType: 'none'
    }
  }

  /**
   * Generate unit circle for trigonometry
   */
  private static generateUnitCircle(description: string): GraphData {
    const circlePoints: GraphPoint[] = []
    
    // Generate unit circle points
    for (let angle = 0; angle < 360; angle += 15) {
      const radian = (angle * Math.PI) / 180
      circlePoints.push({
        x: Math.cos(radian),
        y: Math.sin(radian),
        color: '#e5e7eb'
      })
    }

    return {
      config: {
        width: 400,
        height: 400,
        xMin: -1.5,
        xMax: 1.5,
        yMin: -1.5,
        yMax: 1.5,
        gridSize: 0.5,
        showGrid: true,
        showAxes: true,
        title: 'Unit Circle'
      },
      points: circlePoints,
      lines: [{
        points: circlePoints,
        color: '#3b82f6',
        strokeWidth: 2
      }],
      interactionType: 'point-placement'
    }
  }

  /**
   * Generate default graph
   */
  private static generateDefaultGraph(): GraphData {
    return {
      config: {
        width: 400,
        height: 400,
        xMin: -10,
        xMax: 10,
        yMin: -10,
        yMax: 10,
        gridSize: 1,
        showGrid: true,
        showAxes: true,
        title: 'Graph'
      },
      interactionType: 'point-placement'
    }
  }

  /**
   * Extract points from description
   */
  private static extractPointsFromDescription(description: string): GraphPoint[] {
    const points: GraphPoint[] = []
    
    // Look for coordinate patterns like (3, 4) or (-2, 5)
    const pointRegex = /\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/g
    let match
    
    while ((match = pointRegex.exec(description)) !== null) {
      points.push({
        x: parseFloat(match[1]),
        y: parseFloat(match[2]),
        color: '#ef4444',
        label: `(${match[1]}, ${match[2]})`
      })
    }
    
    return points
  }

  /**
   * Extract lines from description
   */
  private static extractLinesFromDescription(description: string): GraphLine[] {
    const lines: GraphLine[] = []
    
    // Look for line equations like y = 2x + 3
    const lineRegex = /y\s*=\s*(-?\d*\.?\d*)x\s*([+-]\s*\d+\.?\d*)?/g
    let match
    
    while ((match = lineRegex.exec(description)) !== null) {
      const slope = parseFloat(match[1]) || 1
      const intercept = match[2] ? parseFloat(match[2].replace(/\s/g, '')) : 0
      
      // Generate line points
      const linePoints: GraphPoint[] = [
        { x: -10, y: slope * (-10) + intercept },
        { x: 10, y: slope * 10 + intercept }
      ]
      
      lines.push({
        points: linePoints,
        color: '#3b82f6',
        strokeWidth: 2
      })
    }
    
    return lines
  }

  /**
   * Extract functions from description
   */
  private static extractFunctionsFromDescription(description: string): GraphFunction[] {
    const functions: GraphFunction[] = []
    
    // Look for quadratic functions like f(x) = x^2 + 2x + 1
    if (description.includes('x²') || description.includes('x^2') || description.includes('quadratic')) {
      functions.push({
        equation: 'x^2',
        color: '#3b82f6'
      })
    }
    
    // Look for linear functions
    if (description.includes('linear') || description.includes('2x')) {
      functions.push({
        equation: '2x + 1',
        color: '#ef4444'
      })
    }
    
    return functions
  }

  /**
   * Generate points for functions
   */
  private static generateFunctionPoints(functions: GraphFunction[]): GraphPoint[] {
    const points: GraphPoint[] = []
    
    functions.forEach((func, index) => {
      // Generate sample points for the function
      for (let x = -5; x <= 5; x += 0.5) {
        let y = 0
        
        // Simple function evaluation (extend as needed)
        if (func.equation.includes('x^2')) {
          y = x * x
        } else if (func.equation.includes('2x')) {
          y = 2 * x + 1
        }
        
        if (y >= -10 && y <= 10) {
          points.push({
            x,
            y,
            color: func.color || '#3b82f6'
          })
        }
      }
    })
    
    return points
  }

  /**
   * Extract geometry points
   */
  private static extractGeometryPoints(description: string): GraphPoint[] {
    const points: GraphPoint[] = []
    
    if (description.includes('triangle')) {
      points.push(
        { x: 0, y: 4, color: '#ef4444', label: 'A', draggable: true },
        { x: -3, y: 0, color: '#ef4444', label: 'B', draggable: true },
        { x: 3, y: 0, color: '#ef4444', label: 'C', draggable: true }
      )
    }
    
    if (description.includes('square') || description.includes('rectangle')) {
      points.push(
        { x: -2, y: 2, color: '#3b82f6', label: 'A', draggable: true },
        { x: 2, y: 2, color: '#3b82f6', label: 'B', draggable: true },
        { x: 2, y: -2, color: '#3b82f6', label: 'C', draggable: true },
        { x: -2, y: -2, color: '#3b82f6', label: 'D', draggable: true }
      )
    }
    
    return points
  }

  /**
   * Extract geometry lines
   */
  private static extractGeometryLines(description: string): GraphLine[] {
    const lines: GraphLine[] = []
    
    if (description.includes('triangle')) {
      lines.push({
        points: [
          { x: 0, y: 4 },
          { x: -3, y: 0 },
          { x: 3, y: 0 },
          { x: 0, y: 4 }
        ],
        color: '#ef4444',
        strokeWidth: 2
      })
    }
    
    return lines
  }

  /**
   * Generate bar chart
   */
  private static generateBarChart(description: string): GraphData {
    const categories = ['A', 'B', 'C', 'D', 'E']
    const values = [12, 19, 8, 15, 22]
    
    const points: GraphPoint[] = []
    categories.forEach((cat, index) => {
      points.push({
        x: index + 1,
        y: values[index],
        label: `${cat}: ${values[index]}`,
        color: '#3b82f6'
      })
    })

    return {
      config: {
        width: 500,
        height: 300,
        xMin: 0,
        xMax: 6,
        yMin: 0,
        yMax: 25,
        gridSize: 5,
        showGrid: true,
        showAxes: true,
        title: 'Bar Chart',
        xLabel: 'Categories',
        yLabel: 'Values'
      },
      points,
      interactionType: 'none'
    }
  }

  /**
   * Generate line graph
   */
  private static generateLineGraph(description: string): GraphData {
    const dataPoints: GraphPoint[] = [
      { x: 1, y: 5, color: '#ef4444' },
      { x: 2, y: 8, color: '#ef4444' },
      { x: 3, y: 12, color: '#ef4444' },
      { x: 4, y: 7, color: '#ef4444' },
      { x: 5, y: 15, color: '#ef4444' },
      { x: 6, y: 18, color: '#ef4444' }
    ]

    return {
      config: {
        width: 500,
        height: 300,
        xMin: 0,
        xMax: 7,
        yMin: 0,
        yMax: 20,
        gridSize: 2,
        showGrid: true,
        showAxes: true,
        title: 'Line Graph',
        xLabel: 'Time',
        yLabel: 'Value'
      },
      points: dataPoints,
      lines: [{
        points: dataPoints,
        color: '#ef4444',
        strokeWidth: 3
      }],
      interactionType: 'point-placement'
    }
  }

  /**
   * Generate pie chart (represented as points on a circle)
   */
  private static generatePieChart(description: string): GraphData {
    const segments = [
      { label: 'A (30%)', angle: 0, color: '#3b82f6' },
      { label: 'B (25%)', angle: 108, color: '#ef4444' },
      { label: 'C (20%)', angle: 198, color: '#10b981' },
      { label: 'D (15%)', angle: 270, color: '#f59e0b' },
      { label: 'E (10%)', angle: 324, color: '#8b5cf6' }
    ]

    const points: GraphPoint[] = segments.map(segment => {
      const radian = (segment.angle * Math.PI) / 180
      return {
        x: Math.cos(radian) * 3,
        y: Math.sin(radian) * 3,
        label: segment.label,
        color: segment.color
      }
    })

    return {
      config: {
        width: 400,
        height: 400,
        xMin: -4,
        xMax: 4,
        yMin: -4,
        yMax: 4,
        gridSize: 1,
        showGrid: false,
        showAxes: false,
        title: 'Pie Chart Distribution'
      },
      points,
      interactionType: 'none'
    }
  }

  /**
   * Extract data points for statistics
   */
  private static extractDataPoints(description: string): GraphPoint[] {
    const points: GraphPoint[] = []
    
    // Generate sample data points
    const sampleData = [
      { x: 1, y: 5 },
      { x: 2, y: 8 },
      { x: 3, y: 12 },
      { x: 4, y: 7 },
      { x: 5, y: 15 }
    ]
    
    sampleData.forEach(point => {
      points.push({
        x: point.x,
        y: point.y,
        color: '#10b981'
      })
    })
    
    return points
  }
}
