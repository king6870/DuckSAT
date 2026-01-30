"use client"

import { useState } from 'react'
import ImageUpload from './ImageUpload'

interface ChartPoint {
  x: number
  y: number
  label?: string
}

interface ChartDataItem {
  x?: number
  y?: number
  category?: string
  value?: number
  label?: string
}

interface ChartData {
  diagramType?: string
  type?: string
  points?: ChartPoint[]
  data?: ChartDataItem[]
  imageUrl?: string
  title?: string
  xAxis?: string
  yAxis?: string
}

interface ChartBuilderProps {
  chartData: ChartData | null
  onChange: (chartData: ChartData) => void
}

export default function ChartBuilder({ chartData, onChange }: ChartBuilderProps) {
  const [diagramType, setDiagramType] = useState(chartData?.diagramType || 'chart')
  const [chartType, setChartType] = useState(chartData?.type || 'coordinate-plane')
  const [points, setPoints] = useState<ChartPoint[]>(chartData?.points || [])
  const [data, setData] = useState<ChartDataItem[]>(chartData?.data || [])
  const [imageUrl, setImageUrl] = useState(chartData?.imageUrl || '')

  const handleDiagramTypeChange = (type: string) => {
    setDiagramType(type)
    if (type === 'image') {
      onChange({ diagramType: type, imageUrl })
    } else {
      onChange({ diagramType: type, type: chartType, points, data })
    }
  }

  const handleTypeChange = (type: string) => {
    setChartType(type)
    const newChartData: { diagramType: string; type: string; points: ChartPoint[]; data: ChartDataItem[] } = { 
      diagramType, 
      type, 
      points: [] as ChartPoint[], 
      data: [] as ChartDataItem[] 
    }
    
    // Set default data based on type
    switch (type) {
      case 'coordinate-plane':
        newChartData.points = [{ x: 0, y: 0, label: 'Origin' }]
        break
      case 'bar-chart':
        newChartData.data = [{ category: 'A', value: 10 }]
        break
      case 'line-graph':
        newChartData.points = [{ x: 0, y: 0 }, { x: 1, y: 1 }]
        break
      case 'scatter-plot':
        newChartData.points = [{ x: 1, y: 2 }, { x: 3, y: 4 }]
        break
    }
    
    setPoints(newChartData.points)
    setData(newChartData.data)
    onChange(newChartData)
  }

  const handleImageUpload = (url: string) => {
    setImageUrl(url)
    onChange({ diagramType: 'image', imageUrl: url })
  }

  const handleImageRemove = () => {
    setImageUrl('')
    onChange({ diagramType: 'image', imageUrl: '' })
  }

  const addPoint = () => {
    const newPoints = [...points, { x: 0, y: 0, label: '' }]
    setPoints(newPoints)
    onChange({ diagramType, type: chartType, points: newPoints, data })
  }

  const updatePoint = (index: number, field: keyof ChartPoint, value: string | number) => {
    const newPoints = [...points]
    newPoints[index] = { ...newPoints[index], [field]: value }
    setPoints(newPoints)
    onChange({ diagramType, type: chartType, points: newPoints, data })
  }

  const removePoint = (index: number) => {
    const newPoints = points.filter((_point: ChartPoint, i: number) => i !== index)
    setPoints(newPoints)
    onChange({ diagramType, type: chartType, points: newPoints, data })
  }

  const addDataPoint = () => {
    const newData = [...data, { category: '', value: 0 }]
    setData(newData)
    onChange({ diagramType, type: chartType, points, data: newData })
  }

  const updateDataPoint = (index: number, field: keyof ChartDataItem, value: string | number) => {
    const newData = [...data]
    newData[index] = { ...newData[index], [field]: value }
    setData(newData)
    onChange({ diagramType, type: chartType, points, data: newData })
  }

  const removeDataPoint = (index: number) => {
    const newData = data.filter((_item: ChartDataItem, i: number) => i !== index)
    setData(newData)
    onChange({ diagramType, type: chartType, points, data: newData })
  }

  return (
    <div className="border border-gray-300 rounded-lg p-4">
      <h4 className="font-semibold text-gray-900 mb-4">Chart/Diagram Builder</h4>
      
      {/* Diagram Type Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Diagram Type</label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="chart"
              checked={diagramType === 'chart'}
              onChange={(e) => handleDiagramTypeChange(e.target.value)}
              className="mr-2"
            />
            Interactive Chart
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="image"
              checked={diagramType === 'image'}
              onChange={(e) => handleDiagramTypeChange(e.target.value)}
              className="mr-2"
            />
            Upload Image
          </label>
        </div>
      </div>

      {diagramType === 'image' ? (
        <ImageUpload
          imageUrl={imageUrl}
          onImageUpload={handleImageUpload}
          onImageRemove={handleImageRemove}
        />
      ) : (
        <>
          {/* Chart Type Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
            <select
              value={chartType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="coordinate-plane">Coordinate Plane</option>
              <option value="bar-chart">Bar Chart</option>
              <option value="line-graph">Line Graph</option>
              <option value="scatter-plot">Scatter Plot</option>
            </select>
          </div>

          {/* Points Editor (for coordinate-plane, line-graph, scatter-plot) */}
          {['coordinate-plane', 'line-graph', 'scatter-plot'].includes(chartType) && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Points</label>
                <button
                  type="button"
                  onClick={addPoint}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Add Point
                </button>
              </div>
              
              {points.map((point: ChartPoint, index: number) => (
                <div key={index} className="flex gap-2 mb-2 items-center">
                  <input
                    type="number"
                    placeholder="X"
                    value={point.x}
                    onChange={(e) => updatePoint(index, 'x', parseFloat(e.target.value) || 0)}
                    className="w-20 border border-gray-300 rounded px-2 py-1"
                  />
                  <input
                    type="number"
                    placeholder="Y"
                    value={point.y}
                    onChange={(e) => updatePoint(index, 'y', parseFloat(e.target.value) || 0)}
                    className="w-20 border border-gray-300 rounded px-2 py-1"
                  />
                  <input
                    type="text"
                    placeholder="Label"
                    value={point.label || ''}
                    onChange={(e) => updatePoint(index, 'label', e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-2 py-1"
                  />
                  <button
                    type="button"
                    onClick={() => removePoint(index)}
                    className="bg-red-600 text-white px-2 py-1 rounded text-sm hover:bg-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Data Editor (for bar-chart) */}
          {chartType === 'bar-chart' && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Data</label>
                <button
                  type="button"
                  onClick={addDataPoint}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Add Data
                </button>
              </div>
              
              {data.map((item: ChartDataItem, index: number) => (
                <div key={index} className="flex gap-2 mb-2 items-center">
                  <input
                    type="text"
                    placeholder="Category"
                    value={item.category}
                    onChange={(e) => updateDataPoint(index, 'category', e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-2 py-1"
                  />
                  <input
                    type="number"
                    placeholder="Value"
                    value={item.value}
                    onChange={(e) => updateDataPoint(index, 'value', parseFloat(e.target.value) || 0)}
                    className="w-24 border border-gray-300 rounded px-2 py-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeDataPoint(index)}
                    className="bg-red-600 text-white px-2 py-1 rounded text-sm hover:bg-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Preview */}
          <div className="bg-gray-50 p-3 rounded">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Preview Data:</h5>
            <pre className="text-xs text-gray-600 overflow-auto">
              {JSON.stringify({ diagramType, type: chartType, points, data }, null, 2)}
            </pre>
          </div>
        </>
      )}
    </div>
  )
}
