// Excel reader for the Vector CANdb++ 8.2 matrix export.
// Uses exceljs (async-only). Public entry point is parseExcelAsync.
//
// The reader is column-driven: each sheet's columns are looked up by header
// name (case-sensitive) and mapped to internal fields. See column-map.ts for
// the frozen schema. If a real Vector export deviates from this schema, fix
// the map first — do not special-case columns here.

import { Workbook, type Worksheet } from 'exceljs';

import { IOError, ParseError } from '../errors.js';
import { createMessage } from '../model/message.js';
import {
  addMessage,
  addNode,
  createNetwork,
  type Network,
} from '../model/network.js';
import {
  createSignal,
  type ByteOrder,
  type Multiplexed,
  type Signal,
  type ValueType,
} from '../model/signal.js';

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

  const msgSheet = wb.getWorksheet(MESSAGES_SHEET.name);
  if (msgSheet) net = readMessagesSheet(msgSheet, net);

  const sigSheet = wb.getWorksheet(SIGNALS_SHEET.name);
  if (sigSheet) net = readSignalsSheet(sigSheet, net);

  // Tasks 4.6-4.7 will add ValueTables and ValueTableEntries readers here.

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

function readMessagesSheet(ws: Worksheet, net: Network): Network {
  const rows = readSheetRows(ws, MESSAGES_SHEET);
  let next = net;
  for (const row of rows) {
    const name = String(row['name'] ?? '').trim();
    if (!name) continue;

    const idStr = String(row['id'] ?? '').trim();
    const id = parseHexOrDec(idStr);
    if (id === undefined) {
      throw new ParseError(`bad message id: ${idStr}`, { line: 2, column: 1 });
    }
    if (id < 0 || id > 0x1fffffff) {
      throw new ParseError(`message id out of range: 0x${id.toString(16)}`, {
        line: 2,
        column: 1,
      });
    }
    const dlc = Number(row['dlc']);
    if (dlc < 0 || dlc > 8) {
      throw new ParseError(`dlc out of range: ${dlc}`, { line: 2, column: 1 });
    }
    const transmitter = String(row['transmitter'] ?? '').trim();
    const commentCell = row['comment'];
    const comment = commentCell ? String(commentCell) : undefined;

    next = addMessage(next, {
      id,
      name,
      dlc,
      transmitter,
      ...(comment ? { comment } : {}),
    });
  }
  return next;
}

function readSignalsSheet(ws: Worksheet, net: Network): Network {
  const rows = readSheetRows(ws, SIGNALS_SHEET);
  // Group signal rows by message name so a single updateMessageSignals
  // call can install all signals for that message at once.
  const byMessage = new Map<string, Record<string, unknown>[]>();
  for (const r of rows) {
    const msgName = String(r['messageName'] ?? '').trim();
    if (!msgName) continue;
    const list = byMessage.get(msgName);
    if (list) list.push(r);
    else byMessage.set(msgName, [r]);
  }

  let next = net;
  for (const [msgName, sigRows] of byMessage) {
    const idx = next.messages.findIndex((m) => m.name === msgName);
    if (idx < 0) continue; // signal row references a non-existent message
    const signals: Signal[] = sigRows.map((r) => rowToSignal(r));
    next = updateMessageSignals(next, idx, signals);
  }
  return next;
}

function rowToSignal(r: Record<string, unknown>): Signal {
  const mux = String(r['multiplexed'] ?? '').trim();
  const muxValueCell = r['muxValue'];
  const muxValue =
    muxValueCell !== undefined && muxValueCell !== null && muxValueCell !== ''
      ? Number(muxValueCell)
      : 0;
  const muxExtended = r['muxExtended'] === 1 || r['muxExtended'] === '1';

  let multiplexed: Multiplexed = { kind: 'Plain' };
  if (mux === 'Multiplexor') {
    multiplexed = { kind: 'Multiplexor' };
  } else if (mux === 'Muxed') {
    multiplexed = { kind: 'Muxed', value: muxValue };
  } else if (mux === 'Extended' || (muxExtended && muxValueCell !== undefined && muxValueCell !== '')) {
    multiplexed = { kind: 'ExtendedMuxed', value: muxValue };
  }

  const bo = String(r['byteOrder'] ?? '1').trim();
  const byteOrder: ByteOrder =
    bo === '1' || bo === 'Intel' ? 'little-endian' : 'big-endian';

  const vt = String(r['valueType'] ?? '+').trim();
  const valueType: ValueType =
    vt === '+' || vt === 'unsigned'
      ? 'unsigned'
      : vt === '-' || vt === 'signed'
        ? 'signed'
        : vt === 'float'
          ? 'float'
          : 'double';

  const receiversStr = String(r['receivers'] ?? '');
  const receivers = receiversStr
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const valueTableCell = r['valueTable'];
  const valueTable =
    valueTableCell && String(valueTableCell).trim().length > 0
      ? String(valueTableCell).trim()
      : undefined;

  const commentCell = r['comment'];
  const comment = commentCell ? String(commentCell) : undefined;

  return createSignal({
    name: String(r['name'] ?? '').trim(),
    startBit: Number(r['startBit']),
    length: Number(r['length']),
    byteOrder,
    valueType,
    factor: Number(r['factor'] ?? 1),
    offset: Number(r['offset'] ?? 0),
    min: Number(r['min'] ?? 0),
    max: Number(r['max'] ?? 0),
    unit: String(r['unit'] ?? ''),
    receivers,
    multiplexed,
    ...(valueTable !== undefined ? { valueTable } : {}),
    ...(comment !== undefined ? { comment } : {}),
  });
}

function updateMessageSignals(
  net: Network,
  messageIdx: number,
  signals: Signal[],
): Network {
  const orig = net.messages[messageIdx];
  if (!orig) return net;
  const updated = createMessage({ ...orig, signals });
  const newMessages = [...net.messages];
  newMessages[messageIdx] = updated;
  return { ...net, messages: newMessages };
}

function parseHexOrDec(s: string): number | undefined {
  if (!s) return undefined;
  const trimmed = s.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.toLowerCase().startsWith('0x')) {
    return parseInt(trimmed.slice(2), 16);
  }
  return parseInt(trimmed, 10);
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

  // Only project columns whose header is actually present in the sheet.
  // Missing columns yield undefined fields, which the per-sheet readers
  // treat as optional. The column-map remains the schema; sheets with
  // extra or missing columns are tolerated.
  const presentColumns = sheet.columns.filter(
    (c) => headers.indexOf(c.header) >= 0,
  );

  const out: Record<string, unknown>[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: Record<string, unknown> = {};
    for (const col of presentColumns) {
      const colIdx = headers.indexOf(col.header);
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
