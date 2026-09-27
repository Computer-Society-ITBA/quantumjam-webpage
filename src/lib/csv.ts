export type CsvCell = string | string[] | null | undefined

const LIST_SEPARATOR = '; '

// Spreadsheets evaluate cells starting with these as formulas; a leading
// control character (tab, CR) can smuggle one past a naive check.
// https://owasp.org/www-community/attacks/CSV_Injection
// eslint-disable-next-line no-control-regex
const FORMULA_START_RE = /^[=+\-@\u0000-\u001f]/

function serializeCell(value: CsvCell): string {
  if (value == null) return ''
  const text = Array.isArray(value) ? value.join(LIST_SEPARATOR) : value
  const safe = FORMULA_START_RE.test(text) ? `'${text}` : text
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
}

export function toCsv(headers: readonly string[], rows: CsvCell[][]): string {
  return [headers, ...rows]
    .map((row) => row.map(serializeCell).join(','))
    .join('\r\n')
}

/** Downloads text as a UTF-8 CSV; the BOM makes Excel read accents right. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
