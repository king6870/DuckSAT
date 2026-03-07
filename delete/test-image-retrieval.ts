import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testImageRetrieval() {
  console.log('🖼️  Testing Image Retrieval from Database\n' + '='.repeat(80))

  // Get a question with image data
  const questionWithImage = await prisma.question.findFirst({
    where: {
      imageData: { not: null },
      category: 'Geometry'
    }
  })

  if (!questionWithImage) {
    console.log('❌ No questions with images found!')
    return
  }

  console.log(`\n✅ Found Question: ${questionWithImage.id}`)
  console.log(`   Question: ${questionWithImage.question.substring(0, 60)}...`)
  console.log(`   Category: ${questionWithImage.category}`)
  console.log(`   Source: ${questionWithImage.source}`)
  
  if (questionWithImage.imageData) {
    console.log(`\n📊 Image Data:`)
    console.log(`   Size: ${Math.round(questionWithImage.imageData.length / 1024)}KB`)
    console.log(`   MIME Type: ${questionWithImage.imageMimeType}`)
    // Ensure imageData is a Buffer for .toString('hex')
    const buf = Buffer.from(questionWithImage.imageData);
    console.log(`   First 20 bytes: ${buf.slice(0, 20).toString('hex')}`)
    
    // Check if it's a valid PNG (starts with PNG header: 89 50 4E 47)
    const isPNG = questionWithImage.imageData[0] === 0x89 &&
                  questionWithImage.imageData[1] === 0x50 &&
                  questionWithImage.imageData[2] === 0x4E &&
                  questionWithImage.imageData[3] === 0x47
    
    console.log(`   Valid PNG: ${isPNG ? '✅ Yes' : '❌ No'}`)
  }

  // Check chartData
  if (questionWithImage.chartData) {
    // TODO: Replace 'unknown' with a specific type if possible
    const chartData = questionWithImage.chartData as {
      graphType?: string;
      hasDiagram?: boolean;
      interactionType?: string;
      description?: string;
    };
    console.log(`\n📈 Chart Data:`)
    console.log(`   Graph Type: ${chartData.graphType}`)
    console.log(`   Has Diagram: ${chartData.hasDiagram}`)
    console.log(`   Interaction Type: ${chartData.interactionType}`)
    if (chartData.description) {
      console.log(`   Description Preview: ${chartData.description.substring(0, 100)}...`)
    } else {
      console.log('   Description Preview: (none)');
    }
  }

  console.log(`\n${'='.repeat(80)}`)
  console.log('✅ Image retrieval test complete!')
  console.log('📌 Images are stored as BYTEA in PostgreSQL and can be served via API')
  
  await prisma.$disconnect()
}

testImageRetrieval()
