import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Simple 1x1 PNG pixel (valid but tiny)
const SIMPLE_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
  0x00, 0x00, 0x03, 0x00, 0x01, 0xc7, 0x88, 0xb7, 0x85, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
  0x44, 0xae, 0x42, 0x60, 0x82
]);

async function main() {
  console.log('🎨 Adding diagram data to questions...');

  try {
    // Get all math questions without imageData
    const questions = await prisma.question.findMany({
      where: {
        imageData: null,
        moduleType: 'math'
      },
      take: 10  // Update first 10 math questions with diagrams
    });

    console.log(`Found ${questions.length} questions to update`);

    for (const q of questions) {
      // Add a sample diagram to math-related questions
      const updated = await prisma.question.update({
        where: { id: q.id },
        data: {
          imageData: SIMPLE_PNG,
          imageMimeType: 'image/png'
        }
      });

      console.log(`✅ Updated question: ${updated.question.substring(0, 50)}...`);
    }

    console.log('🎉 Diagram data added successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
