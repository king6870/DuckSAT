import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const total = await p.question.count({ where: { isActive: true } });
  const withImage = await p.question.count({ where: { isActive: true, imageData: { not: null } } });
  const withChart = await p.question.count({ where: { isActive: true, chartData: { not: null } } });
  const withUrl = await p.question.count({ where: { isActive: true, imageUrl: { not: null } } });
  
  console.log(`Total active: ${total}`);
  console.log(`With imageData: ${withImage}`);
  console.log(`With chartData: ${withChart}`);
  console.log(`With imageUrl: ${withUrl}`);

  // Sample with imageData
  if (withImage > 0) {
    const s = await p.question.findFirst({
      where: { isActive: true, imageData: { not: null } },
      select: { id: true, question: true, category: true, imageMimeType: true, imageAlt: true, imageData: true }
    });
    if (s) {
      console.log(`\nSample imageData question:`);
      console.log(`  id: ${s.id}`);
      console.log(`  category: ${s.category}`);
      console.log(`  mime: ${s.imageMimeType}`);
      console.log(`  alt: ${s.imageAlt}`);
      const dataStr = Buffer.isBuffer(s.imageData) ? s.imageData.toString('base64').substring(0, 80) : String(s.imageData).substring(0, 80);
      console.log(`  imageData length: ${s.imageData?.length}`);
      console.log(`  imageData (base64 preview): ${dataStr}...`);
    }
  }

  // Sample with chartData  
  if (withChart > 0) {
    const s = await p.question.findFirst({
      where: { isActive: true, chartData: { not: null } },
      select: { id: true, question: true, category: true, chartData: true }
    });
    if (s) {
      console.log(`\nSample chartData question:`);
      console.log(`  id: ${s.id}`);
      console.log(`  category: ${s.category}`);
      console.log(`  chartData: ${JSON.stringify(s.chartData).substring(0, 300)}`);
    }
  }

  // Group by visualType
  const vTypes = await p.question.groupBy({
    by: ['visualType'],
    where: { isActive: true },
    _count: { id: true }
  });
  console.log(`\nBy visualType:`);
  vTypes.forEach(v => console.log(`  ${String(v.visualType).padEnd(25)} ${v._count.id}`));

  await p.$disconnect();
}

main();
