/**
 * Table formatter for CLI output
 * Provides column alignment similar to prom-cli output
 */

export interface TableColumn {
  header: string;
  key: string;
  width?: number;
}

export interface TableOptions {
  columns: TableColumn[];
  data: Record<string, unknown>[];
}

/**
 * Calculate column widths based on content
 */
function calculateWidths(columns: TableColumn[], data: Record<string, unknown>[]): number[] {
  return columns.map((col) => {
    const headerWidth = col.header.length;
    const maxDataWidth = data.reduce((max, row) => {
      const value = String(row[col.key] ?? "");
      return Math.max(max, value.length);
    }, 0);
    return col.width ?? Math.max(headerWidth, maxDataWidth);
  });
}

/**
 * Pad string to specified width
 */
function padEnd(str: string, width: number): string {
  const value = String(str);
  if (value.length >= width) {
    return value.slice(0, width);
  }
  return value + " ".repeat(width - value.length);
}

/**
 * Format data as aligned table
 */
export function formatTable(options: TableOptions): string {
  const { columns, data } = options;

  if (data.length === 0) {
    return "No data";
  }

  const widths = calculateWidths(columns, data);

  // Build header row
  const headers = columns.map((col, i) => padEnd(col.header, widths[i])).join("   ");

  // Build data rows
  const rows = data.map((row) =>
    columns.map((col, i) => padEnd(String(row[col.key] ?? ""), widths[i])).join("   "),
  );

  return [headers, ...rows].join("\n");
}
