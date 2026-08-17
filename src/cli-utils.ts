/**
 * Shared CLI input-parsing helpers used across command files.
 */

/**
 * Parse a CLI-provided id argument as a strict non-negative integer.
 *
 * Unlike bare `parseInt(value, 10)` + `isNaN`, this rejects trailing
 * garbage (e.g. "12abc") instead of silently truncating it to a valid
 * id (12) — `parseInt` stops at the first non-digit rather than
 * requiring the whole string to be numeric.
 *
 * Exits the process with an actionable message if the value isn't
 * purely numeric.
 */
export function parseNumericId(value: string, label: string): number {
  if (!/^\d+$/.test(value)) {
    console.error(`Error: ${label} must be a positive number.`);
    process.exit(1);
  }
  return parseInt(value, 10);
}
