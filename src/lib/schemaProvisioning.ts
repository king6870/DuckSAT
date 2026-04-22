export function isSchemaProvisioningError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)

  return (
    message.includes('P2021') ||
    message.includes('P2022') ||
    message.includes('Invalid object name') ||
    message.includes('does not exist in the current database') ||
    message.includes('Could not find table') ||
    message.includes('Column names in each table must be unique')
  )
}

export function schemaProvisioningResponse(feature: 'friends' | 'group-study') {
  return {
    error: `${feature}_schema_pending`,
    schemaPending: true,
    message: `${feature === 'friends' ? 'Friends' : 'Group study'} database schema is still being provisioned.`,
  }
}
