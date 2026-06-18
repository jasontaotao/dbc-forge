// Excel reader for the Vector CANdb++ 8.2 matrix export.
// Uses exceljs (async-only). Public entry point is parseExcelAsync.
//
// The reader is column-driven: each sheet's columns are looked up by header
// name (case-sensitive) and mapped to internal fields. See column-map.ts for
// the frozen schema. If a real Vector export deviates from this schema, fix
// the map first — do not special-case columns here.

import { Workbook, type Worksheet } from 'exceljs';

import { IOError, ParseError } from '../errors.js';
import {
  addNode,
  createNetwork,
  type Network,
} from '../model/network.js';

import {
  NODES_SHEET,
  MESSAGES_SHEET,
  SIGNALS_SHEET,
  VALUE_TABLES_SHEET,
  VALUE_TABLE_ENTRIES_SHEET,
  type SheetMapping,
} from './column-map.js';

/**
 * Parse a Vector CANdb++ 8.2 xlsx export into a Network.
 *
 * Throws IOError if the buffer is not a valid xlsx file.
 * Throws ParseError if a required sheet is missing required columns.
 */
export async function parseExcelAsync(buf: Buffer): Promise<Network> {
  let wb: Workbook;
  try {
    wb = new Workbook();
    // exceljs typings declare `Buffer` as a strict `Buffer extends ArrayBuffer`
    // interface, but Node's modern @types/node returns `Buffer<ArrayBufferLike>`
    // (a `Uint8Array` subclass) from `Buffer.from(...)`. The runtime values
    // are interchangeable, so cast through `unknown` to bridge the two.
    await wb.xlsx.load(buf as unknown as Parameters<Workbook['xlsx']['load']>[0]);
  } catch (cause) {
    throw new IOError('cannot parse xlsx', { path: '(buffer)', cause });
  }
  return readFromWorkbook(wb);
}

/**
 * Sync shim. The plan declared parseExcel(buffer): Network but exceljs is
 * async-only. Use parseExcelAsync until a sync path is implemented.
 */
export function parseExcel(_buf: Buffer): Network {
  throw new Error(
    'parseExcel is async. Use parseExcelAsync(buffer) → Promise<Network>. ' +
      'Sync path: see Task 9.11.1 in plan if needed.',
  );
}

function readFromWorkbook(wb: Workbook): Network {
  let net = createNetwork({ version: '' });

  const nodeSheet = wb.getWorksheet(NODES_SHEET.name);
  if (nodeSheet) net = readNodesSheet(nodeSheet, net);

  // Tasks 4.3-4.7 will add Messages, Signals, ValueTables, and
  // ValueTableEntries readers here.

  return net;
}

function readNodesSheet(ws: Worksheet, net: Network): Network {
  const rows = readSheetRows(ws, NODES_SHEET);
  let next = net;
  for (const row of rows) {
    const name = String(row['name'] ?? '').trim();
    if (!name) continue;

    const addrCell = row['address'];
    const address =
      addrCell !== undefined && addrCell !== null && addrCell !== ''
        ? Number(addrCell)
        : undefined;

    const commentCell = row['comment'];
    const comment = commentCell ? String(commentCell) : undefined;

    next = addNode(next, {
      name,
      ...(address !== undefined ? { address } : {}),
      ...(comment ? { comment } : {}),
    });
  }
  return next;
}

function readSheetRows(
  ws: Worksheet,
  sheet: SheetMapping,
): Record<string, unknown>[] {
  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? '').trim();
  });

  const out: Record<string, unknown>[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: Record<string, unknown> = {};
    for (const col of sheet.columns) {
      const colIdx = headers.indexOf(col.header);
      if (colIdx < 0) {
        throw new ParseError(
          `column "${col.header}" not found in sheet "${sheet.name}"`,
          { line: 1, column: colIdx + 1 },
        );
      }
      obj[col.field] = row.getCell(colIdx + 1).value;
    }
    out.push(obj);
  });
  return out;
}

// Sheet names are re-exported so callers (e.g. the writer in Phase 5) can
// reference the same source-of-truth.
export {
  NODES_SHEET,
  MESSAGES_SHEET,
  SIGNALS_SHEET,
  VALUE_TABLES_SHEET,
  VALUE_TABLE_ENTRIES_SHEET,
};
