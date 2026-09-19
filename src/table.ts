/**
 * A box-drawn table for the CLI's human output.
 *
 * Terminal output only. The `--json` shape is a contract other tools parse, and
 * nothing here touches it.
 */

export interface Column {
  header: string;
  /** Right-align a column of numbers; the default is left. */
  align?: 'left' | 'right';
}

/** Printable width. Close enough for ids, names and counts. */
function width(value: string): number {
  return [...value].length;
}

function pad(value: string, to: number, align: Column['align']): string {
  const gap = ' '.repeat(Math.max(0, to - width(value)));
  return align === 'right' ? `${gap}${value}` : `${value}${gap}`;
}

/**
 * Render `rows` under `columns`, every column as wide as its widest cell.
 * An empty cell reads as an em dash, so a blank is visibly nothing rather than
 * looking like a rendering slip.
 */
export function renderTable(columns: Column[], rows: string[][], indent = '  '): string {
  const cell = (row: string[], index: number): string => row[index]?.trim() || '—';

  const widths = columns.map((column, index) =>
    Math.max(width(column.header), ...rows.map((row) => width(cell(row, index))), 1),
  );

  const line = (left: string, fill: string, join: string, right: string): string =>
    `${indent}${left}${widths.map((w) => fill.repeat(w + 2)).join(join)}${right}`;

  const body = (cells: string[]): string =>
    `${indent}│ ${columns
      .map((column, index) => pad(cells[index] ?? '', widths[index]!, column.align))
      .join(' │ ')} │`;

  return [
    line('┌', '─', '┬', '┐'),
    body(columns.map((column) => column.header)),
    line('├', '─', '┼', '┤'),
    ...rows.map((row) => body(columns.map((_, index) => cell(row, index)))),
    line('└', '─', '┴', '┘'),
  ].join('\n');
}
