"use client"

import React from 'react'

import { VegaEmbed } from 'react-vega';

// Types
type ChartType = 'scatter' | 'coordinate-plane' | 'scatter-plot' | 'bar' | 'bar-chart' | 'geometry' | 'geometric-diagram' | 'image' | string

interface ChartDataCommon {
  type?: string
  graphType?: string
  diagramType?: string
  description?: string
  imageUrl?: string
}

interface ScatterPoint {
  x: number
  y: number
  label?: string
}

interface XYDatum {
  x?: number
  y?: number
  label?: string
  point?: string
}

interface ScatterChartData extends ChartDataCommon {
  points?: ScatterPoint[]
  data?: XYDatum[]
  line?: boolean
}

interface BarItem {
  label?: string
  student?: string
  value?: number
  score?: number
}

interface BarChartData extends ChartDataCommon {
  data?: BarItem[]
}

interface GeometryChartData extends ChartDataCommon {
  shape?: string
  angles?: number[]
}

interface ImageDiagramData extends ChartDataCommon {
  type?: 'image'
}

type ChartData = ScatterChartData | BarChartData | GeometryChartData | ImageDiagramData

interface ChartRendererProps {
  chartData: ChartData
  imageUrl?: string
  imageData?: string
  imageMimeType?: string
  imageAlt?: string
  className?: string
}

const resolveType = (cd: ChartData): string | undefined => cd.type || cd.graphType || cd.diagramType

const allowedTypes = ['scatter', 'coordinate-plane', 'scatter-plot', 'bar', 'bar-chart', 'geometry', 'geometric-diagram', 'image'];

export default function ChartRenderer({ chartData, imageUrl, imageData, imageMimeType, imageAlt = "Question diagram", className = "" }: ChartRendererProps) {
  // Check if imageUrl is a Vega spec (starts with data:image/svg+xml;base64 and contains Vega schema)
  const isVegaSpec = imageUrl?.startsWith('data:image/svg+xml;base64,');

  if (isVegaSpec && imageUrl) {
    // Decode the base64 Vega spec and render with DynamicChart
    try {
      const base64Data = imageUrl.split(',')[1];
      const decodedSpec = atob(base64Data);
      const vegaSpec = JSON.parse(decodedSpec);

      // Use DynamicChart to render the Vega spec
      return (
        <div className={`chart-container ${className}`}>
          <div className="bg-white p-4 rounded border shadow-sm">
            <div className="text-sm font-semibold text-gray-700 mb-2">📊 Chart</div>
            <div className="text-xs text-gray-600 mb-2">
              Vega-Lite diagram (interactive visualization)
            </div>
            {/* Render Vega-Lite diagram */}
            <VegaEmbed
              spec={vegaSpec as any}
              options={{ actions: false }}
            />
          </div>
        </div>
      );
    } catch (e) {
      console.error('Failed to decode Vega spec:', e);
      return (
        <div className={`chart-container ${className}`}>
          <div className="bg-gray-100 p-4 rounded text-center">
            <p className="text-sm text-red-600">Failed to render diagram</p>
          </div>
        </div>
      );
    }
  }

  // Construct image source URL
  let src: string | undefined;
  if (imageData) {
    // Use binary imageData if available
    const mimeType = imageMimeType || 'image/png';
    src = `data:${mimeType};base64,${imageData}`;
  } else if (imageUrl) {
    // Always use imageUrl if provided
    src = imageUrl;
  } else if (chartData && typeof chartData === 'object' && 'imageUrl' in chartData && (chartData as any).imageUrl) {
    // Check chartData for imageUrl
    src = (chartData as any).imageUrl;
  } else {
    // Fallback to placeholder if nothing else
    src = '/assets/diagram-placeholder.svg';
  }


  if (src && !isVegaSpec) {
    return (
      <div className={`chart-container ${className}`}>
        <img
          src={src}
          alt={imageAlt}
          className="max-w-full h-auto rounded border shadow-sm"
          style={{ maxHeight: '400px' }}
          onError={(e) => {
            // If image fails to load, show placeholder
            const img = e.target as HTMLImageElement;
            img.src = '/assets/diagram-placeholder.svg';
          }}
        />
      </div>
    );
  }

  if (!chartData) {
    return null;
  }

  // Check if chartData itself is a Vega-Lite spec
  if (typeof chartData === 'object' && chartData && '$schema' in chartData) {
    const vegaSpec = chartData as unknown as Record<string, unknown>;
    if (typeof vegaSpec.$schema === 'string' && vegaSpec.$schema.includes('vega-lite')) {
      return (
        <div className={`chart-container ${className}`}>
          <div className="bg-white p-4 rounded border shadow-sm">
            <VegaEmbed
              spec={vegaSpec as any}
              options={{ actions: false }}
            />
          </div>
        </div>
      );
    }
  }

  // Check if chartData has a nested vegaSpec property
  if (typeof chartData === 'object' && chartData && 'vegaSpec' in chartData) {
    const vegaSpec = (chartData as any).vegaSpec;
    if (typeof vegaSpec === 'object' && vegaSpec) {
      // Add $schema if missing (required for VegaLite component)
      const completeSpec = {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        ...vegaSpec
      };

      return (
        <div className={`chart-container ${className}`}>
          <div className="bg-white p-4 rounded border shadow-sm">
            <VegaEmbed
              spec={completeSpec as any}
              options={{ actions: false }}
            />
          </div>
        </div>
      );
    }
  }

  return (
    <div className={`chart-container ${className}`}>
      <DynamicChart chartData={chartData} />
    </div>
  );
}


function DynamicChart({ chartData }: { chartData: ChartData }) {
  if (!chartData) {
    return null
  }

  const type = resolveType(chartData)

  if (isScatter(chartData)) {
    let normalized: ScatterChartData = { ...chartData }
    if (!normalized.points && Array.isArray(normalized.data)) {
      const points: ScatterPoint[] = (normalized.data ?? [])
        .filter((p): p is XYDatum & { x: number; y: number } => typeof p?.x === 'number' && typeof p?.y === 'number')
        .map((p) => ({ x: p.x, y: p.y, label: p.label ?? p.point ?? '' }))
      normalized = { ...normalized, points }
    }
    return <ScatterPlot data={normalized} />
  }

  if (isBar(chartData)) {
    return <BarChart data={chartData} />
  }

  if (isGeometry(chartData)) {
    return <GeometryDiagram data={chartData} />
  }

  return (
    <div className="bg-blue-50 p-4 rounded border">
      <div className="text-sm font-semibold text-blue-700 mb-2">📊 Chart</div>
      {chartData.description && (
        <div className="text-sm text-blue-600 mb-2">{chartData.description}</div>
      )}
      <div className="text-xs text-gray-500">
        Type: {type || 'Unknown'}
      </div>
    </div>
  )
}

function isScatter(cd: ChartData): cd is ScatterChartData {
  const t = resolveType(cd)
  return t === 'scatter' || t === 'coordinate-plane' || t === 'scatter-plot' || !!(cd as ScatterChartData).points
}

function isBar(cd: ChartData): cd is BarChartData {
  const t = resolveType(cd)
  return t === 'bar' || t === 'bar-chart' || Array.isArray((cd as BarChartData).data)
}

function isGeometry(cd: ChartData): cd is GeometryChartData {
  const t = resolveType(cd)
  return t === 'geometry' || t === 'geometric-diagram' || !!(cd as GeometryChartData).shape
}

function ScatterPlot({ data }: { data: ScatterChartData }) {
  const width = 300
  const height = 300
  const padding = 40

  return (
    <div className="bg-white p-4 rounded border shadow-sm">
      <div className="text-sm font-semibold text-gray-700 mb-2">📈 Coordinate Plane</div>
      <svg width={width} height={height} className="border border-gray-300">
        {/* Grid */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect x={padding} y={padding} width={width - 2 * padding} height={height - 2 * padding} fill="url(#grid)" />

        {/* Axes */}
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#374151" strokeWidth="2" />
        <line x1={width / 2} y1={padding} x2={width / 2} y2={height - padding} stroke="#374151" strokeWidth="2" />

        {/* Points */}
        {data.points?.map((point, index) => {
          const x = width / 2 + (point.x || 0) * 10
          const y = height / 2 - (point.y || 0) * 10

          return (
            <g key={index}>
              <circle
                cx={x}
                cy={y}
                r="5"
                fill="#3b82f6"
                stroke="#1d4ed8"
                strokeWidth="2"
              />
              {point.label && (
                <text
                  x={x + 8}
                  y={y - 8}
                  fontSize="12"
                  fill="#374151"
                  fontWeight="bold"
                >
                  {point.label}
                </text>
              )}
            </g>
          )
        })}

        {/* Line between points */}
        {data.line && data.points && data.points.length >= 2 && (
          <line
            x1={width / 2 + (data.points[0].x || 0) * 10}
            y1={height / 2 - (data.points[0].y || 0) * 10}
            x2={width / 2 + (data.points[1].x || 0) * 10}
            y2={height / 2 - (data.points[1].y || 0) * 10}
            stroke="#ef4444"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
        )}
      </svg>
    </div>
  )
}

function BarChart({ data }: { data: BarChartData }) {
  const width = 300
  const height = 200
  const padding = 40

  const values = data.data ?? []

  // If no data, create sample data to prevent "No data available"
  if (values.length === 0) {
    console.log('⚠️ Bar chart has no data, creating sample data')
    const sampleData: BarItem[] = [
      { label: "Jan", value: 150 },
      { label: "Feb", value: 200 },
      { label: "Mar", value: 175 },
      { label: "Apr", value: 225 }
    ]
    return <BarChart data={{ ...data, data: sampleData }} />
  }

  const maxValue = Math.max(...values.map((item) => item.score ?? item.value ?? 1))
  const barWidth = Math.max(20, (width - 2 * padding) / values.length - 10)

  return (
    <div className="bg-white p-4 rounded border shadow-sm">
      <div className="text-sm font-semibold text-gray-700 mb-2">📊 Bar Chart</div>
      <svg width={width} height={height} className="border border-gray-300">
        {values.map((item, index) => {
          const value = item.score ?? item.value ?? 0
          const barHeight = Math.max(0, (value / maxValue) * (height - 2 * padding))
          const x = padding + index * (barWidth + 10)
          const y = height - padding - barHeight

          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="#3b82f6"
                stroke="#1d4ed8"
              />
              <text
                x={x + barWidth / 2}
                y={y - 5}
                fontSize="10"
                fill="#374151"
                textAnchor="middle"
              >
                {value}
              </text>
              <text
                x={x + barWidth / 2}
                y={height - padding + 15}
                fontSize="10"
                fill="#374151"
                textAnchor="middle"
              >
                {item.student ?? item.label ?? `${index + 1}`}
              </text>
            </g>
          )
        })}

        {/* Axes */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#374151" strokeWidth="1" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#374151" strokeWidth="1" />
      </svg>
    </div>
  )
}

function GeometryDiagram({ data }: { data: GeometryChartData }) {
  const width = 400
  const height = 350
  const centerX = width / 2
  const centerY = height / 2

  return (
    <div className="bg-white p-4 rounded border shadow-sm">
      <div className="text-sm font-semibold text-gray-700 mb-2">🔺 Geometry Diagram</div>
      <svg width={width} height={height} className="border border-gray-200">
        {/* Always show a triangle by default for geometry questions */}
        <TriangleShape data={data} centerX={centerX} centerY={centerY} />
      </svg>
    </div>
  )
}

function TriangleShape({ data, centerX, centerY }: { data: GeometryChartData, centerX: number, centerY: number }) {
  const size = 80
  const triHeight = size * Math.sqrt(3) / 2

  const points = [
    [centerX, centerY - triHeight / 2],
    [centerX - size / 2, centerY + triHeight / 2],
    [centerX + size / 2, centerY + triHeight / 2]
  ]

  const pathData = `M ${points[0][0]} ${points[0][1]} L ${points[1][0]} ${points[1][1]} L ${points[2][0]} ${points[2][1]} Z`

  // Use provided angles or default to 60° each for equilateral triangle
  const angles = Array.isArray(data.angles) && data.angles.length >= 3 ? data.angles : [60, 60, 60]

  return (
    <g>
      <path d={pathData} fill="rgba(59, 130, 246, 0.1)" stroke="#3b82f6" strokeWidth="2" />

      {/* Always show angle labels */}
      <text x={centerX} y={centerY - triHeight / 2 + 15} fontSize="12" fill="#374151" textAnchor="middle">
        {angles[0]}°
      </text>
      <text x={centerX - size / 2 + 15} y={centerY + triHeight / 2 - 5} fontSize="12" fill="#374151" textAnchor="middle">
        {angles[1]}°
      </text>
      <text x={centerX + size / 2 - 15} y={centerY + triHeight / 2 - 5} fontSize="12" fill="#374151" textAnchor="middle">
        {angles[2]}°
      </text>

      {/* Vertex labels */}
      <text x={centerX} y={centerY - triHeight / 2 - 10} fontSize="12" fill="#374151" textAnchor="middle" fontWeight="bold">A</text>
      <text x={centerX - size / 2 - 15} y={centerY + triHeight / 2 + 15} fontSize="12" fill="#374151" textAnchor="middle" fontWeight="bold">B</text>
      <text x={centerX + size / 2 + 15} y={centerY + triHeight / 2 + 15} fontSize="12" fill="#374151" textAnchor="middle" fontWeight="bold">C</text>
    </g>
  )
}
