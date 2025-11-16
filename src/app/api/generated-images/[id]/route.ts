import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * API Route: Serve generated images from database
 * GET /api/generated-images/[id]
 * 
 * This route retrieves images stored as blobs in the database and serves them
 * with the appropriate content type. This approach ensures compatibility with
 * serverless deployments (like Vercel) where filesystem storage is ephemeral.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const questionId = id

    // Fetch question with image data from database
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        imageData: true,
        imageMimeType: true,
        imageAlt: true,
      },
    })

    // If question not found or has no image data, return 404 SVG
    if (!question || !question.imageData) {
      console.warn(`Image not found or no blob data for question ${questionId}`)
      return new NextResponse(get404SVG(), {
        status: 404,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }

    // Return the image with appropriate content type
    return new NextResponse(question.imageData, {
      status: 200,
      headers: {
        'Content-Type': question.imageMimeType || 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
        'X-Image-Alt': question.imageAlt || 'Math diagram',
      },
    })
  } catch (error) {
    console.error('Error serving image:', error)
    
    // Return 404 SVG on error
    return new NextResponse(get404SVG(), {
      status: 500,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache',
      },
    })
  }
}

/**
 * Generate a user-friendly 404 SVG when image is not found
 */
function get404SVG(): string {
  return `
    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="40%" font-family="Arial, sans-serif" font-size="24" 
            fill="#6b7280" text-anchor="middle" dominant-baseline="middle">
        📊 Image Not Available
      </text>
      <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="14" 
            fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">
        This diagram could not be loaded
      </text>
      <text x="50%" y="65%" font-family="Arial, sans-serif" font-size="12" 
            fill="#d1d5db" text-anchor="middle" dominant-baseline="middle">
        Please contact support if this issue persists
      </text>
    </svg>
  `.trim()
}
