import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()

const TARGET_DIRS = [
  'generated-questions',
  'generated-batches',
  'generated_batches',
  'organized-questions',
  'output'
]

function walkJsonFiles(dirPath: string, files: string[] = []): string[] {
  if (!fs.existsSync(dirPath)) return files

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      walkJsonFiles(fullPath, files)
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
      files.push(fullPath)
    }
  }

  return files
}

function validateJsonFile(filePath: string): { ok: boolean; error?: string } {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    JSON.parse(content)
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown parse error'
    }
  }
}

function main() {
  const dirs = TARGET_DIRS.map(dir => path.join(ROOT, dir)).filter(fs.existsSync)

  if (dirs.length === 0) {
    console.log('[validate-generated-json] No target directories found. Nothing to validate.')
    return
  }

  const allJsonFiles = dirs.flatMap(dir => walkJsonFiles(dir))

  if (allJsonFiles.length === 0) {
    console.log('[validate-generated-json] No JSON files found in target directories.')
    return
  }

  let invalidCount = 0

  for (const file of allJsonFiles) {
    const result = validateJsonFile(file)
    if (!result.ok) {
      invalidCount++
      const relative = path.relative(ROOT, file)
      console.error(`[INVALID] ${relative}`)
      console.error(`  ${result.error}`)
    }
  }

  const validCount = allJsonFiles.length - invalidCount
  console.log(
    `[validate-generated-json] Checked ${allJsonFiles.length} file(s): ${validCount} valid, ${invalidCount} invalid.`
  )

  if (invalidCount > 0) {
    process.exit(1)
  }
}

main()
