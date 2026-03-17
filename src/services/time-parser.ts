/**
 * Parse a time expression into a Unix timestamp in milliseconds.
 *
 * Supported formats:
 *   now           → current time
 *   now-1h        → 1 hour ago  (units: m, h, d, w, y)
 *   1609459200    → Unix seconds (10-digit)
 *   1609459200000 → Unix milliseconds (13-digit)
 *   2021-01-01T00:00:00Z → ISO 8601
 */
export function parseTime(input: string): number {
  if (input === "now") return Date.now();

  const relMatch = input.match(/^now-(\d+)([mhdwy])$/);
  if (relMatch) {
    const amount = parseInt(relMatch[1], 10);
    const unit = relMatch[2];
    const ms: Record<string, number> = {
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
      y: 365 * 24 * 60 * 60 * 1000,
    };
    return Date.now() - amount * ms[unit];
  }

  if (/^\d{10}$/.test(input)) return parseInt(input, 10) * 1000;
  if (/^\d{13}$/.test(input)) return parseInt(input, 10);

  const date = new Date(input);
  if (!isNaN(date.getTime())) return date.getTime();

  throw new Error(
    `Invalid time format: "${input}". Examples: now, now-1h, now-24h, 2021-01-01T00:00:00Z`,
  );
}
