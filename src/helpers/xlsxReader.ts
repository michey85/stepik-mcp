import { inflateRawSync } from 'node:zlib';

/**
 * Minimal, purpose-built XLSX reader.
 *
 * Avoids pulling in `xlsx`/`exceljs` (both carry unresolved advisories or a
 * heavy, partly-deprecated dependency tree) for the narrow job of reading a
 * single, simply-structured worksheet (no styles/formulas/merged cells) out
 * of Stepik-generated report files.
 */

function readZipEntries(buf: Buffer, names: Set<string>): Map<string, Buffer> {
  const result = new Map<string, Buffer>();
  const eocdSig = 0x06054b50;
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === eocdSig) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error(
      'Not a valid zip file (end of central directory not found)',
    );
  }

  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  let offset = buf.readUInt32LE(eocdOffset + 16);

  for (let i = 0; i < totalEntries; i++) {
    if (buf.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error('Malformed zip central directory');
    }
    const compressionMethod = buf.readUInt16LE(offset + 10);
    const compressedSize = buf.readUInt32LE(offset + 20);
    const filenameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commentLen = buf.readUInt16LE(offset + 32);
    const localHeaderOffset = buf.readUInt32LE(offset + 42);
    const filename = buf.toString(
      'utf8',
      offset + 46,
      offset + 46 + filenameLen,
    );

    if (names.has(filename)) {
      if (buf.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
        throw new Error(`Malformed local file header for ${filename}`);
      }
      const localFilenameLen = buf.readUInt16LE(localHeaderOffset + 26);
      const localExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
      const dataStart =
        localHeaderOffset + 30 + localFilenameLen + localExtraLen;
      const compressed = buf.subarray(dataStart, dataStart + compressedSize);
      const data =
        compressionMethod === 0
          ? Buffer.from(compressed)
          : inflateRawSync(compressed);
      result.set(filename, data);
    }

    offset += 46 + filenameLen + extraLen + commentLen;
  }

  return result;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code)),
    )
    .replace(/&amp;/g, '&');
}

function parseSharedStrings(xml: string): string[] {
  const strings: string[] = [];
  const siRegex = /<si>([\s\S]*?)<\/si>/g;
  let match: RegExpExecArray | null;
  while ((match = siRegex.exec(xml))) {
    const text = [...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
      .map((m) => decodeXmlEntities(m[1]))
      .join('');
    strings.push(text);
  }
  return strings;
}

function columnToIndex(column: string): number {
  let index = 0;
  for (const char of column) {
    index = index * 26 + (char.charCodeAt(0) - 64);
  }
  return index - 1;
}

function parseWorksheetRows(xml: string, sharedStrings: string[]): string[][] {
  const rows: string[][] = [];
  const rowRegex = /<row[^>]*>([\s\S]*?)<\/row>/g;
  const cellRegex = /<c r="([A-Z]+)\d+"([^>]*)>([\s\S]*?)<\/c>/g;

  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(xml))) {
    const cells: string[] = [];
    cellRegex.lastIndex = 0;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(rowMatch[1]))) {
      const [, column, attrs, content] = cellMatch;
      const isSharedString = /\bt="s"/.test(attrs);
      const valueMatch = /<v>([\s\S]*?)<\/v>/.exec(content);
      let value = '';
      if (valueMatch) {
        value = isSharedString
          ? (sharedStrings[Number(valueMatch[1])] ?? '')
          : decodeXmlEntities(valueMatch[1]);
      }
      cells[columnToIndex(column)] = value;
    }
    rows.push(cells);
  }

  return rows;
}

function findSheetRid(workbookXml: string, sheetName: string): string {
  const tagRegex = /<sheet\b[^>]*\/>/g;
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(workbookXml))) {
    const nameMatch = /name="([^"]*)"/.exec(match[0]);
    const ridMatch = /r:id="([^"]*)"/.exec(match[0]);
    if (nameMatch?.[1] === sheetName && ridMatch) {
      return ridMatch[1];
    }
  }
  throw new Error(`Sheet "${sheetName}" not found in workbook`);
}

function findRelTarget(relsXml: string, rId: string): string {
  const tagRegex = /<Relationship\b[^>]*\/>/g;
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(relsXml))) {
    const idMatch = /Id="([^"]*)"/.exec(match[0]);
    const targetMatch = /Target="([^"]*)"/.exec(match[0]);
    if (idMatch?.[1] === rId && targetMatch) {
      return targetMatch[1];
    }
  }
  throw new Error(`Relationship "${rId}" not found in workbook rels`);
}

/**
 * Reads a named worksheet from an XLSX file buffer and returns its rows as
 * objects keyed by the first row (the header row).
 */
export function readXlsxSheetAsObjects(
  buffer: Buffer,
  sheetName: string,
): Record<string, string>[] {
  const entries = readZipEntries(
    buffer,
    new Set([
      'xl/sharedStrings.xml',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
    ]),
  );

  const sharedStrings = entries.has('xl/sharedStrings.xml')
    ? parseSharedStrings(entries.get('xl/sharedStrings.xml')!.toString('utf8'))
    : [];

  const workbookXml = entries.get('xl/workbook.xml');
  const relsXml = entries.get('xl/_rels/workbook.xml.rels');
  if (!workbookXml || !relsXml) {
    throw new Error(
      'Malformed xlsx: missing workbook.xml or its relationships',
    );
  }

  const rId = findSheetRid(workbookXml.toString('utf8'), sheetName);
  const target = findRelTarget(relsXml.toString('utf8'), rId);
  const sheetPath = `xl/${target}`;

  const sheetEntries = readZipEntries(buffer, new Set([sheetPath]));
  const sheetXml = sheetEntries.get(sheetPath);
  if (!sheetXml) {
    throw new Error(`Worksheet file "${sheetPath}" not found in xlsx`);
  }

  const rows = parseWorksheetRows(sheetXml.toString('utf8'), sharedStrings);
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      if (header) obj[header] = row[i] ?? '';
    });
    return obj;
  });
}
