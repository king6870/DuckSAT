// One-time migration: add isTester and promoCodeUsed columns to users table
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking existing columns...');

  // Check if columns already exist
  const columns = await prisma.$queryRaw`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'users' AND COLUMN_NAME IN ('isTester', 'promoCodeUsed')
  `;

  const existing = columns.map(c => c.COLUMN_NAME);
  console.log('Existing columns:', existing);

  if (!existing.includes('isTester')) {
    console.log('Adding isTester column...');
    await prisma.$executeRaw`ALTER TABLE [users] ADD [isTester] BIT NOT NULL DEFAULT 0`;
    console.log('✓ isTester added');
  } else {
    console.log('✓ isTester already exists');
  }

  if (!existing.includes('promoCodeUsed')) {
    console.log('Adding promoCodeUsed column...');
    await prisma.$executeRaw`ALTER TABLE [users] ADD [promoCodeUsed] NVARCHAR(1000) NULL`;
    console.log('✓ promoCodeUsed added');
  } else {
    console.log('✓ promoCodeUsed already exists');
  }

  console.log('Migration complete!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
