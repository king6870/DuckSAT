// Temporary script to add onboarding columns
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const columns = [
    { name: 'onboardingCompleted', sql: "ALTER TABLE users ADD onboardingCompleted BIT NOT NULL DEFAULT 0" },
    { name: 'highestSATScore', sql: "ALTER TABLE users ADD highestSATScore INT NULL" },
    { name: 'bluebookTestsTaken', sql: "ALTER TABLE users ADD bluebookTestsTaken INT NULL" },
    { name: 'otherPrepApps', sql: "ALTER TABLE users ADD otherPrepApps NVARCHAR(MAX) NULL" },
    { name: 'strongCategories', sql: "ALTER TABLE users ADD strongCategories NVARCHAR(MAX) NULL" },
    { name: 'weakCategories', sql: "ALTER TABLE users ADD weakCategories NVARCHAR(MAX) NULL" },
    { name: 'targetScore', sql: "ALTER TABLE users ADD targetScore INT NULL" },
    { name: 'gradeLevel', sql: "ALTER TABLE users ADD gradeLevel NVARCHAR(1000) NULL" },
  ];

  for (const col of columns) {
    try {
      await prisma.$executeRawUnsafe(col.sql);
      console.log(`Added column: ${col.name}`);
    } catch (e) {
      if (e.message && e.message.includes('already exists')) {
        console.log(`Column already exists: ${col.name}`);
      } else {
        console.error(`Error adding ${col.name}:`, e.message);
      }
    }
  }
}

main()
  .then(() => { console.log('Done'); process.exit(0); })
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
