import { Prisma } from '@prisma/client'

export function isAIAgentSchemaNotReady(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2021' || error.code === 'P2022'
  }

  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()

  return (
    lower.includes('ai_agent_') &&
    (lower.includes('does not exist') || lower.includes('invalid object name') || lower.includes('unknown column'))
  )
}
