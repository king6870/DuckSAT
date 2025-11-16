#!/usr/bin/env tsx

import { imageGenerationService, ChartConfig } from '../src/services/imageGenerationService'

async function testImageGeneration() {
  console.log('🧪 Testing image generation...')
  
  try {
    // Test coordinate plane generation
    console.log('\n📊 Testing coordinate plane generation...')
    const coordinatePlaneConfig = {
      type: 'coordinate-plane' as const,
      description: 'Coordinate plane from -5 to 5 on both axes. Shows parabola y = x^2 - 4x + 3 with vertex at (2, -1), y-intercept at (0, 3), and x-intercepts at (1, 0) and (3, 0). Grid lines every 1 unit.',
      width: 600,
      height: 400
    }
    
    const coordinateImage = await imageGenerationService.generateSVGChart(coordinatePlaneConfig)
    console.log('✅ Coordinate plane SVG generated:', coordinateImage)
    
    // Test bar chart generation
    console.log('\n📊 Testing bar chart generation...')
    const barChartConfig = {
      type: 'bar-chart' as const,
      description: 'Bar chart showing test scores: 70-79 (5 students), 80-89 (12 students), 90-99 (8 students). Y-axis shows frequency, X-axis shows score ranges.',
      data: [5, 12, 8],
      width: 500,
      height: 300
    }
    
    const barImage = await imageGenerationService.generateSVGChart(barChartConfig)
    console.log('✅ Bar chart SVG generated:', barImage)
    
    // Test scatter plot generation
    console.log('\n📊 Testing scatter plot generation...')
    const scatterConfig: ChartConfig = {
      type: 'scatter-plot' as const,
      description: 'Scatter plot with x-axis labeled Hours of Study (0 to 10) and y-axis labeled Test Scores (50 to 100). Data points: (1, 55), (2, 60), (4, 72), (6, 85), (8, 92), (10, 98).',
      data: [[1, 55], [2, 60], [4, 72], [6, 85], [8, 92], [10, 98]] as [number, number][],
      width: 500,
      height: 300
    }
    
    const scatterImage = await imageGenerationService.generateSVGChart(scatterConfig)
    console.log('✅ Scatter plot SVG generated:', scatterImage)
    
    // Test DALL-E generation (may fail due to API limits)
    console.log('\n🎨 Testing DALL-E image generation...')
    try {
      const dalleImage = await imageGenerationService.generateChartImage(coordinatePlaneConfig)
      if (dalleImage) {
        console.log('✅ DALL-E image generated:', dalleImage)
      } else {
        console.log('⚠️ DALL-E generation failed (expected - API may be restricted)')
      }
    } catch (error: any) {
      console.log('⚠️ DALL-E generation failed:', error.message)
    }
    
    console.log('\n✅ Image generation testing completed!')
    
  } catch (error: any) {
    console.error('❌ Image generation test failed:', error)
  }
}

testImageGeneration()
