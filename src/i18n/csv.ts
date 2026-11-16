/**
 * RFC 4180 CSV, in both directions.
 *
 * Language packs other than the default ship as CSV so a translator can edit
 * them in a spreadsheet. The format is deliberately the plainest one a
 * spreadsheet exports: a header row, one record per line, quoted fields only
 * where a value contains a comma, a quote or a line break, and `""` for a
 * literal quote inside a quoted field.
 *
 * Both functions are pure: no DOM, no Node APIs, so the parser runs in the
 * browser, in tests and in the sync script alike.
 */

/** A field needs quotes when it holds a delimiter, a quote or a line break. */
const NEEDS_QUOTES = /[",\r\n]/;

/**
 * Parses CSV text into rows of fields.
 *
 * Handles quoted fields, `""` escapes, commas and line breaks inside quotes,
 * CRLF and LF line endings, and a leading byte-order mark (Excel writes one).
 * The empty line a trailing newline leaves behind is not a row.
 */
export function parseCsv(text: string): string[][] {
  const source = text.startsWith("\uFEFF") ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let position = 0;

  while (position < source.length) {
    const char = source[position];

    if (quoted) {
      if (char === '"') {
        if (source[position + 1] === '"') {
          field += '"';
          position += 2;
          continue;
        }
        quoted = false;
        position += 1;
        continue;
      }
      field += char;
      position += 1;
      continue;
    }

    if (char === '"') {
      quoted = true;
      position += 1;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      position += 1;
      continue;
    }

    if (char === "\r" || char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      position += char === "\r" && source[position + 1] === "\n" ? 2 : 1;
      continue;
    }

    field += char;
    position += 1;
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/**
 * Writes rows as CSV with LF line endings and a trailing newline.
 *
 * A field is quoted only when it has to be, so a spreadsheet shows the same
 * text a reader sees here.
 */
export function serializeCsv(rows: readonly (readonly string[])[]): string {
  if (rows.length === 0) return "";

  const lines = rows.map((row) =>
    row
      .map((field) =>
        NEEDS_QUOTES.test(field) ? `"${field.replaceAll('"', '""')}"` : field
      )
      .join(",")
  );

  return `${lines.join("\n")}\n`;
}
