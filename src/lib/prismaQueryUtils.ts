/**
 * Utility functions for safe Prisma raw SQL queries
 * 
 * This module provides utilities for executing raw SQL queries safely
 * using Prisma's $queryRaw with proper parameterization to prevent SQL injection.
 */

import { Prisma } from '@prisma/client';

/**
 * Example column selection for question queries
 * 
 * IMPORTANT: In production code, never use dynamic or user-controlled values here.
 * This constant is hardcoded for demonstration purposes only.
 * Consider using TypeScript enums or importing from schema-generated types for type safety.
 */
const QUESTION_COLUMNS = 'id, question, options, correctAnswer, explanation' as const;

/**
 * Example of UNSAFE raw query pattern (DO NOT USE):
 * 
 * // ❌ UNSAFE - Using Prisma.join in template string can be risky
 * const rows = await prisma.$queryRaw`
 *   SELECT * FROM questions WHERE id IN (${Prisma.join(ids)})
 * `;
 * 
 * Issues:
 * - Prisma.join inside template strings is discouraged
 * - Newer Prisma versions may throw errors for this pattern  
 * - Not as safe as parameterized queries
 */

/**
 * Executes a safe parameterized query to fetch questions by IDs
 * 
 * Example of SAFE query pattern with parameterization:
 * 
 * SECURITY NOTE: The column names are hardcoded in a constant to prevent SQL injection.
 * Never use user input directly in column names or table names.
 * 
 * @example
 * const ids = ['id1', 'id2', 'id3'];
 * const results = await safeQueryQuestionsByIds<{id: string, question: string}>(prisma, ids);
 * 
 * @typeParam T - The expected return type for each row. Defaults to unknown for flexibility.
 * @param prisma - Prisma client instance
 * @param ids - Array of question IDs to fetch
 * @returns Promise resolving to array of question records
 */
export async function safeQueryQuestionsByIds<T = unknown>(
  prisma: { $queryRawUnsafe: (query: string, ...values: unknown[]) => Promise<T[]> },
  ids: string[]
): Promise<T[]> {
  if (!ids || ids.length === 0) {
    return [];
  }

  // ✅ SAFE - Using parameterized query with proper placeholders
  // This creates placeholders like $1, $2, $3 for PostgreSQL
  // Column names are from a hardcoded constant, not user input
  const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
  
  const query = `SELECT ${QUESTION_COLUMNS} FROM questions WHERE id IN (${placeholders})`;

  // Pass parameters separately from the query string
  return await prisma.$queryRawUnsafe(query, ...ids);
}

/**
 * Alternative safe pattern using Prisma.sql for even better type safety
 * 
 * Note: This uses PostgreSQL-specific syntax (ANY with array cast).
 * For database-agnostic queries, use safeQueryQuestionsByIds instead.
 * 
 * SECURITY NOTE: Column names are from a hardcoded constant wrapped in Prisma.raw().
 * Prisma.raw() should only be used with hardcoded, trusted values, never user input.
 * 
 * @example
 * const ids = ['id1', 'id2', 'id3'];
 * const results = await safeQueryWithPrismaSQL<{id: string, question: string}>(prisma, ids);
 * 
 * @typeParam T - The expected return type for each row. Defaults to unknown for flexibility.
 * @param prisma - Prisma client instance
 * @param ids - Array of question IDs to fetch
 * @returns Promise resolving to array of question records
 */
export async function safeQueryWithPrismaSQL<T = unknown>(
  prisma: { $queryRaw: (query: Prisma.Sql) => Promise<T[]> },
  ids: string[]
): Promise<T[]> {
  if (!ids || ids.length === 0) {
    return [];
  }

  // ✅ SAFE - Using Prisma.sql for compile-time safety
  // Prisma.raw() is safe here because QUESTION_COLUMNS is a hardcoded constant
  // The ids parameter is properly escaped by Prisma.sql
  // Note: Uses PostgreSQL-specific syntax
  const query = Prisma.sql`SELECT ${Prisma.raw(QUESTION_COLUMNS)} FROM questions WHERE id = ANY(${ids}::text[])`;
  return await prisma.$queryRaw(query);
}

/**
 * Best practice: Use Prisma ORM methods whenever possible instead of raw SQL
 * 
 * @example
 * // ✅ BEST - Use Prisma's built-in methods (preferred over raw SQL)
 * const questions = await prisma.question.findMany({
 *   where: {
 *     id: {
 *       in: ids
 *     }
 *   }
 * });
 */
