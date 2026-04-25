import * as YAML from 'js-yaml';

export type ExportFormat = 'csv' | 'json' | 'yaml';

/** Discover all string keys present across the rows. */
function collectKeys(rows: any[]): string[] {
  const seen = new Set<string>();
  for (const r of rows) {
    if (r && typeof r === 'object') {
      for (const k of Object.keys(r)) seen.add(k);
    }
  }
  return Array.from(seen);
}

function csvEscape(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object') v = JSON.stringify(v);
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: any[]): string {
  if (rows.length === 0) return '';
  const cols = collectKeys(rows);
  const header = cols.map(csvEscape).join(',');
  const body = rows
    .map((r) => cols.map((c) => csvEscape(r?.[c])).join(','))
    .join('\n');
  return `${header}\n${body}\n`;
}

export function serializeFor(format: ExportFormat, rows: any[]): { text: string; mime: string; ext: string } {
  switch (format) {
    case 'csv':
      return { text: toCsv(rows), mime: 'text/csv;charset=utf-8', ext: 'csv' };
    case 'json':
      return { text: JSON.stringify(rows, null, 2), mime: 'application/json', ext: 'json' };
    case 'yaml':
      return { text: YAML.dump(rows, { lineWidth: 120 }), mime: 'application/yaml', ext: 'yaml' };
  }
}

export function downloadAs(filename: string, mime: string, text: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/** Build a filename like `squads-2026-04-25.csv`. */
export function makeFilename(prefix: string, ext: string): string {
  const d = new Date();
  const ymd = d.toISOString().slice(0, 10);
  return `${prefix}-${ymd}.${ext}`;
}
