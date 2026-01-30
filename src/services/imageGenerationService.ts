// Image and Chart Generation Service
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { prisma } from '@/lib/prisma'

export interface ChartConfig {
  type: 'coordinate-plane' | 'bar-chart' | 'scatter-plot' | 'box-plot' | 'geometric-diagram' | 'function-graph'
  description: string
  data?: Record<string, unknown> | number[] | [number, number][]
  width?: number
  height?: number
  questionId?: string // Optional: Question ID to store image directly in question record
}

export interface ImageData {
  data: Buffer
  mimeType: string
}

export class ImageGenerationService {
  private readonly DALLE_ENDPOINT = 'https://ai-manojwin82958ai594424696620.openai.azure.com/openai/deployments/dall-e-3/images/generations?api-version=2024-02-01'
  private readonly API_KEY = process.env.AZURE_OPENAI_API_KEY || ''
  private readonly IMAGES_DIR = join(process.cwd(), 'public', 'generated-images')

  constructor() {
    this.ensureImagesDirectory()
  }

  /**
   * Generate image from chart description using DALL-E
   */
  async generateChartImage(chartConfig: ChartConfig): Promise<string | null> {
    try {
      console.log('🎨 Generating chart image with DALL-E...')
      const prompt = this.buildImagePrompt(chartConfig)
      console.log('DALL-E Prompt:', prompt)
      console.log('ChartConfig:', JSON.stringify(chartConfig))

      const response = await fetch(this.DALLE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
          style: "natural"
        })
      })

      if (!response.ok) {
        const errorText = await response.text();
        console.error('DALL-E API Error:', response.status, response.statusText, 'Response:', errorText, 'Prompt:', prompt, 'ChartConfig:', JSON.stringify(chartConfig));
        return null;
      }

      const data = await response.json();
      const imageUrl = data.data?.[0]?.url;

      if (imageUrl) {
        // Download and save the image locally
        const localPath = await this.downloadAndSaveImage(imageUrl, chartConfig.type);
        console.log('✅ Chart image generated and saved:', localPath);
        return localPath;
      }

      console.error('DALL-E returned no imageUrl. Data:', JSON.stringify(data), 'Prompt:', prompt, 'ChartConfig:', JSON.stringify(chartConfig));
      return null;
    } catch (error) {
      console.error('Chart image generation failed:', error, 'Prompt:', this.buildImagePrompt(chartConfig), 'ChartConfig:', JSON.stringify(chartConfig));
      return null;
    }
  }

  /**
   * Generate SVG chart programmatically and store in database
   * Returns the question ID that can be used to reference the image
   */
  async generateSVGChart(chartConfig: ChartConfig): Promise<string | null> {
    try {
      console.log('📊 Generating SVG chart programmatically...')
      console.log('SVG ChartConfig:', JSON.stringify(chartConfig));

      let svg = '';

      switch (chartConfig.type) {
        case 'coordinate-plane':
          svg = this.generateCoordinatePlane(chartConfig);
          break;
        case 'bar-chart':
          svg = this.generateBarChart(chartConfig);
          break;
        case 'scatter-plot':
          svg = this.generateScatterPlot(chartConfig);
          break;
        case 'function-graph':
          svg = this.generateFunctionGraph(chartConfig);
          break;
        default:
          console.error('SVG generation failed: Unsupported chart type', chartConfig.type, 'ChartConfig:', JSON.stringify(chartConfig));
          return null;
      }

      if (svg) {
        // Store image in database if questionId is provided
        if (chartConfig.questionId) {
          const imageBuffer = Buffer.from(svg, 'utf-8');
          await this.storeImageInDatabase(chartConfig.questionId, imageBuffer, 'image/svg+xml');
          console.log(`✅ SVG stored in database for question ${chartConfig.questionId}`);
          return `/api/generated-images/${chartConfig.questionId}`;
        } else {
          // Fallback: save to filesystem for backwards compatibility
          const filename = `chart-${Date.now()}-${chartConfig.type}.svg`;
          const filepath = join(this.IMAGES_DIR, filename);
          await writeFile(filepath, svg);
          return `/generated-images/${filename}`;
        }
      }

      console.error('SVG generation returned empty string. ChartConfig:', JSON.stringify(chartConfig));
      return null;
    } catch (error) {
      console.error('SVG chart generation failed:', error, 'ChartConfig:', JSON.stringify(chartConfig));
      return null;
    }
  }

  /**
   * Store image data directly in the database for a specific question
   */
  async storeImageInDatabase(questionId: string, imageData: Buffer, mimeType: string): Promise<void> {
    try {
      await prisma.question.update({
        where: { id: questionId },
        data: {
          imageData: Buffer.from(imageData),
          imageMimeType: mimeType,
          imageUrl: `/api/generated-images/${questionId}`, // Update URL to point to API route
        },
      })
      console.log(`✅ Image stored in database for question ${questionId}`)
    } catch (error) {
      console.error('Failed to store image in database:', error)
      throw error
    }
  }

  /**
   * Generate SVG and return as ImageData object (without saving)
   */
  async generateSVGImageData(chartConfig: ChartConfig): Promise<ImageData | null> {
    try {
      let svg = ''
      
      switch (chartConfig.type) {
        case 'coordinate-plane':
          svg = this.generateCoordinatePlane(chartConfig)
          break
        case 'bar-chart':
          svg = this.generateBarChart(chartConfig)
          break
        case 'scatter-plot':
          svg = this.generateScatterPlot(chartConfig)
          break
        case 'function-graph':
          svg = this.generateFunctionGraph(chartConfig)
          break
        default:
          return null
      }
      
      if (svg) {
        return {
          data: Buffer.from(svg, 'utf-8'),
          mimeType: 'image/svg+xml'
        }
      }
      
      return null
    } catch (error) {
      console.error('SVG generation failed:', error)
      return null
    }
  }

  /**
   * Build DALL-E prompt for chart generation
   */
  private buildImagePrompt(chartConfig: ChartConfig): string {
    const basePrompt = "Create a clean, educational mathematical chart or graph suitable for SAT practice. "
    
    switch (chartConfig.type) {
      case 'coordinate-plane':
        return basePrompt + "Generate a coordinate plane with grid lines, labeled axes, and the mathematical elements described. Use clear, readable fonts and high contrast colors. " + chartConfig.description
      
      case 'bar-chart':
        return basePrompt + "Create a professional bar chart with labeled axes, clear data bars, and readable text. Use educational colors and clean design. " + chartConfig.description
      
      case 'scatter-plot':
        return basePrompt + "Generate a scatter plot with clearly marked data points, labeled axes, and any trend lines mentioned. Use professional styling. " + chartConfig.description
      
      case 'box-plot':
        return basePrompt + "Create a box plot diagram with clearly marked quartiles, median, and outliers. Use educational formatting. " + chartConfig.description
      
      case 'geometric-diagram':
        return basePrompt + "Generate a geometric diagram with labeled angles, sides, and vertices. Use clear lines and professional mathematical notation. " + chartConfig.description
      
      case 'function-graph':
        return basePrompt + "Create a function graph with coordinate axes, grid lines, and the plotted function. Use clear mathematical styling. " + chartConfig.description
      
      default:
        return basePrompt + chartConfig.description
    }
  }

  /**
   * Download image from URL and save locally
   */
  private async downloadAndSaveImage(imageUrl: string, chartType: string): Promise<string> {
    const response = await fetch(imageUrl)
    const buffer = await response.arrayBuffer()
    
    const filename = `chart-${Date.now()}-${chartType}.png`
    const filepath = join(this.IMAGES_DIR, filename)
    
    await writeFile(filepath, Buffer.from(buffer))
    return `/generated-images/${filename}`
  }

  /**
   * Generate coordinate plane SVG
   */
  private generateCoordinatePlane(config: ChartConfig): string {
    const width = config.width || 400
    const height = config.height || 400
    const gridSize = 20
    
    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="${gridSize}" height="${gridSize}" patternUnits="userSpaceOnUse">
            <path d="M ${gridSize} 0 L 0 0 0 ${gridSize}" fill="none" stroke="#e0e0e0" stroke-width="1"/>
          </pattern>
        </defs>
        
        <!-- Grid -->
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        <!-- Axes -->
        <line x1="0" y1="${height/2}" x2="${width}" y2="${height/2}" stroke="#333" stroke-width="2"/>
        <line x1="${width/2}" y1="0" x2="${width/2}" y2="${height}" stroke="#333" stroke-width="2"/>
        
        <!-- Axis labels -->
        <text x="${width-10}" y="${height/2-5}" font-family="Arial" font-size="12" fill="#333">x</text>
        <text x="${width/2+5}" y="15" font-family="Arial" font-size="12" fill="#333">y</text>
        
        <!-- Origin -->
        <circle cx="${width/2}" cy="${height/2}" r="3" fill="#333"/>
        <text x="${width/2+5}" y="${height/2+15}" font-family="Arial" font-size="10" fill="#333">0</text>
      </svg>
    `
  }

  /**
   * Generate bar chart SVG
   */
  private generateBarChart(config: ChartConfig): string {
    const width = config.width || 400
    const height = config.height || 300
    const rawData = config.data || [10, 25, 15, 30, 20]
    const data = Array.isArray(rawData) ? rawData as number[] : [10, 25, 15, 30, 20]
    const maxValue = Math.max(...data)
    const barWidth = width / (data.length * 1.5)
    
    let bars = ''
    data.forEach((value: number, index: number) => {
      const barHeight = (value / maxValue) * (height - 50)
      const x = (index + 0.5) * barWidth
      const y = height - barHeight - 30
      
      bars += `
        <rect x="${x}" y="${y}" width="${barWidth * 0.8}" height="${barHeight}" fill="#4f46e5"/>
        <text x="${x + barWidth * 0.4}" y="${height - 10}" font-family="Arial" font-size="10" text-anchor="middle">${index + 1}</text>
        <text x="${x + barWidth * 0.4}" y="${y - 5}" font-family="Arial" font-size="10" text-anchor="middle">${value}</text>
      `
    })
    
    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        ${bars}
        <!-- Axes -->
        <line x1="30" y1="${height-30}" x2="${width-30}" y2="${height-30}" stroke="#333" stroke-width="2"/>
        <line x1="30" y1="30" x2="30" y2="${height-30}" stroke="#333" stroke-width="2"/>
      </svg>
    `
  }

  /**
   * Generate scatter plot SVG
   */
  private generateScatterPlot(config: ChartConfig): string {
    const width = config.width || 400
    const height = config.height || 300
    const rawData = config.data || [[1, 2], [2, 4], [3, 3], [4, 6], [5, 5]]
    const data: [number, number][] = Array.isArray(rawData) ? rawData as [number, number][] : [[1, 2], [2, 4], [3, 3], [4, 6], [5, 5]]
    
    let points = ''
    data.forEach((point) => {
      const [x, y] = point;
      const plotX = 50 + (x / 6) * (width - 100)
      const plotY = height - 50 - (y / 8) * (height - 100)
      points += `<circle cx="${plotX}" cy="${plotY}" r="4" fill="#ef4444"/>`
    })
    
    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        ${points}
        <!-- Axes -->
        <line x1="50" y1="${height-50}" x2="${width-50}" y2="${height-50}" stroke="#333" stroke-width="2"/>
        <line x1="50" y1="50" x2="50" y2="${height-50}" stroke="#333" stroke-width="2"/>
      </svg>
    `
  }

  /**
   * Generate function graph SVG
   */
  private generateFunctionGraph(config: ChartConfig): string {
    const width = config.width || 400
    const height = config.height || 400
    
    // Simple parabola example
    let path = 'M'
    for (let x = -10; x <= 10; x += 0.5) {
      const y = x * x / 4 // Simple parabola
      const plotX = width/2 + x * 15
      const plotY = height/2 - y * 5
      path += ` ${plotX},${plotY}`
    }
    
    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        
        <!-- Grid -->
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        <!-- Axes -->
        <line x1="0" y1="${height/2}" x2="${width}" y2="${height/2}" stroke="#333" stroke-width="2"/>
        <line x1="${width/2}" y1="0" x2="${width/2}" y2="${height}" stroke="#333" stroke-width="2"/>
        
        <!-- Function curve -->
        <path d="${path}" fill="none" stroke="#2563eb" stroke-width="3"/>
      </svg>
    `
  }

  /**
   * Ensure images directory exists
   */
  private async ensureImagesDirectory(): Promise<void> {
    if (!existsSync(this.IMAGES_DIR)) {
      await mkdir(this.IMAGES_DIR, { recursive: true })
    }
  }
}

export const imageGenerationService = new ImageGenerationService()
