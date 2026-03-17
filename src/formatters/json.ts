/**
 * Format data as JSON with pretty printing
 */
export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}
