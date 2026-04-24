import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function ensureColumns() {
  const statements = [
    {
      name: 'users.joinedViaQrCode',
      sql: `
IF COL_LENGTH('users', 'joinedViaQrCode') IS NULL
BEGIN
  ALTER TABLE users
  ADD joinedViaQrCode BIT NOT NULL CONSTRAINT DF_users_joinedViaQrCode DEFAULT 0;
END
`,
    },
    {
      name: 'users.qrCodeJoinedAt',
      sql: `
IF COL_LENGTH('users', 'qrCodeJoinedAt') IS NULL
BEGIN
  ALTER TABLE users
  ADD qrCodeJoinedAt DATETIME2 NULL;
END
`,
    },
  ]

  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement.sql)
      console.log(`Ensured column: ${statement.name}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`Failed ensuring ${statement.name}: ${message}`)
      throw error
    }
  }
}

async function main() {
  await ensureColumns()
  console.log('QR tracking column check complete.')
}

main()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
