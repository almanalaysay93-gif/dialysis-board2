/**
 * Minimal CSV serialisation for report exports. Pure functions with no DOM
 * access so they can be unit tested; the browser-only download step lives with
 * the component that triggers it.
 */

/** Quote a field only when it needs it, doubling any embedded quotes. */
export function csvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Local "YYYY-MM-DD HH:mm". Staff read these in ward time, so this
 * deliberately uses the local timezone rather than UTC.
 */
export function csvDate(d: Date | null | undefined): string {
  if (!d) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Join rows into a CSV document. CRLF line endings for Excel. */
export function toCsv(rows: readonly (readonly unknown[])[]): string {
  return rows.map(r => r.map(csvField).join(",")).join("\r\n");
}
