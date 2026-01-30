import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Create a simple bar chart as SVG, then convert to PNG-like data
function createSimpleBarChartSVG(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect fill="#f0f0f0" width="400" height="300"/>
  <text x="200" y="30" text-anchor="middle" font-size="16" font-family="Arial" fill="#333">Sample Data Chart</text>
  
  <!-- Bars -->
  <rect x="50" y="200" width="60" height="50" fill="#4285f4"/>
  <rect x="130" y="150" width="60" height="100" fill="#34a853"/>
  <rect x="210" y="180" width="60" height="70" fill="#fbbc04"/>
  <rect x="290" y="120" width="60" height="130" fill="#ea4335"/>
  
  <!-- Labels -->
  <text x="80" y="270" text-anchor="middle" font-size="12" fill="#666">Q1</text>
  <text x="160" y="270" text-anchor="middle" font-size="12" fill="#666">Q2</text>
  <text x="240" y="270" text-anchor="middle" font-size="12" fill="#666">Q3</text>
  <text x="320" y="270" text-anchor="middle" font-size="12" fill="#666">Q4</text>
  
  <!-- Axis -->
  <line x1="40" y1="250" x2="370" y2="250" stroke="#999" stroke-width="2"/>
  <line x1="40" y1="80" x2="40" y2="250" stroke="#999" stroke-width="2"/>
</svg>`;
}

function createGeometryTriangleSVG(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect fill="#fff" width="400" height="300"/>
  <text x="200" y="30" text-anchor="middle" font-size="16" font-family="Arial" fill="#333">Right Triangle</text>
  
  <!-- Triangle -->
  <polygon points="100,220 100,100 300,220" fill="none" stroke="#2563eb" stroke-width="3"/>
  
  <!-- Right angle marker -->
  <rect x="100" y="200" width="20" height="20" fill="none" stroke="#2563eb" stroke-width="2"/>
  
  <!-- Labels -->
  <text x="90" y="160" font-size="14" fill="#333">a</text>
  <text x="200" y="245" font-size="14" fill="#333">b</text>
  <text x="210" y="155" font-size="14" fill="#333">c</text>
  
  <!-- Vertices -->
  <circle cx="100" cy="220" r="4" fill="#2563eb"/>
  <circle cx="100" cy="100" r="4" fill="#2563eb"/>
  <circle cx="300" cy="220" r="4" fill="#2563eb"/>
</svg>`;
}

async function main() {
  console.log('📊 Adding realistic diagram data to questions...');

  try {
    // Get math questions (including those with existing imageData to replace tiny PNGs)
    const mathQuestions = await prisma.question.findMany({
      where: {
        moduleType: 'math'
      },
      take: 15
    });

    console.log(`Found ${mathQuestions.length} math questions to update`);

    for (let i = 0; i < mathQuestions.length; i++) {
      const q = mathQuestions[i];
      
      // Alternate between bar chart and triangle
      const svgContent = i % 2 === 0 ? createGeometryTriangleSVG() : createSimpleBarChartSVG();
      const svgBuffer = Buffer.from(svgContent, 'utf-8');

      await prisma.question.update({
        where: { id: q.id },
        data: {
          imageData: svgBuffer,
          imageMimeType: 'image/svg+xml'
        }
      });

      console.log(`✅ Updated ${i + 1}/${mathQuestions.length}: ${q.question.substring(0, 50)}...`);
    }

    console.log('🎉 Diagram data added successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
