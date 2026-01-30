/**
 * Shared API response types for consistent error handling across the application
 */

/**
 * Standard error response format for API routes
 */
export interface ApiErrorResponse {
  error: string;
  message?: string;
  details?: string;
  timestamp?: string;
  stack?: string;
}

/**
 * Specific error response for database unavailability (503)
 */
export interface DatabaseUnavailableError extends ApiErrorResponse {
  error: 'database_unavailable';
  message: string;
}

/**
 * Type guard to check if a response is a database unavailable error
 */
export function isDatabaseUnavailableError(
  data: unknown
): data is DatabaseUnavailableError {
  return (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    data.error === 'database_unavailable'
  );
}

/**
 * Type guard to check if a response is any API error
 */
export function isApiError(data: unknown): data is ApiErrorResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof (data as ApiErrorResponse).error === 'string'
  );
}
