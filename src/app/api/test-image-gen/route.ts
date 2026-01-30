// Temporary Next.js API route for testing image generation
import { NextResponse } from 'next/server';
import { imageGenerationService, ChartConfig } from '../../../services/imageGenerationService';

export async function GET() {
  const chartConfig: ChartConfig = {
    type: 'geometric-diagram',
    description: 'Right triangle ABC with right angle at C. BC = 3 units is one leg, AC = x units is the other leg, AB = 5 units is the hypotenuse. A small square at C denotes the right angle; A is at the left, B at the right, and C at the bottom-left corner, with side lengths labeled accordingly.',
    width: 400,
    height: 400,
    questionId: undefined
  };

  let dalleResult = null;
  let svgResult = null;
  let error = null;
  try {
    dalleResult = await imageGenerationService.generateChartImage(chartConfig);
  } catch (e) {
    error = e;
  }
  try {
    svgResult = await imageGenerationService.generateSVGChart(chartConfig);
  } catch (e) {
    error = e;
  }

  return NextResponse.json({
    dalleResult,
    svgResult,
    error: error ? String(error) : null,
  });
}
