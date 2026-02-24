import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tests = await prisma.practiceTest.findMany();
  console.log('Practice Tests:');
  for (const test of tests) {
    console.log(`ID: ${test.id}, Name: ${test.name}`);
  }
  await prisma.$disconnect();
}

main();
