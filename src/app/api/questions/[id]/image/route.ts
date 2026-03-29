/**
 * Question Image API
 * 
 * GET /api/questions/[id]/image - Serves question image data as binary HTTP response
 * 
 * Used for lazy-loading question images instead of including them
 * in the bulk practice test API response.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const question = await prisma.question.findUnique({
      where: { id },
      select: {
        imageData: true,
        imageMimeType: true,
      },
    });

    if (!question || !question.imageData) {
      return new NextResponse(null, { status: 404 });
    }

    const mimeType = question.imageMimeType || 'image/png';
    const imageBuffer = Buffer.from(question.imageData);

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=86400, immutable',
        'Content-Length': imageBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[questions/image] Error serving image:', error);
    return new NextResponse(null, { status: 500 });
  }
}
