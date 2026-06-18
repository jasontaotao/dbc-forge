// Excel reader for the Vector CANdb++ 8.2 matrix export.
// Uses exceljs (async-only). Public entry point is parseExcelAsync.
//
// The reader is column-driven: each sheet's columns are looked up by header
// name (case-sensitive) and mapped to internal fields. See column-map.ts for
// the frozen schema. If a real Vector export deviates from this schema, fix
// the map first — do not special-case columns here.

// exceljs exports a CJS object; the runtime `import ExcelJS from 'exceljs'`
// gives us the workbook constructor via Node's CJS-default interop. The
// eslint-plugin-import rules flag this as a missing default export, but
// the import works at runtime under NodeNext resolution.
// eslint-disable-next-line import/default, import/no-named-as-default-member
import ExcelJS, { type Workbook as WorkbookType, type Worksheet } from 'exceljs';

const { Workbook } = ExcelJS;
type Workbook = WorkbookType;

import { IOError, ParseError } from '../errors.js';
import { createMessage } from '../model/message.js';
import {
  addAttributeAssignment,
  addAttributeDef,
  addMessage,
  addNode,
  addValueTable,
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
import { createValueTable, type ValueTableEntry } from '../model/value-table.js';
import type { AttributeTargetRef, AttrTarget, AttrType } from '../model/attributes/attribute.js';

import {
  ATTRIBUTE_ASSIGNMENTS_SHEET,
  ATTRIBUTE_DEFS_SHEET,
  MESSAGES_SHEET,
  MUX_EXTENSIONS_SHEET,
  NETWORK_SHEET,
  NODES_SHEET,
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

  // The Network sheet is read first so its version / BusType / Baudrate /
  // DBName land on the network before any other sheet creates messages
  // or attribute assignments.
  const networkSheet = wb.getWorksheet(NETWORK_SHEET.name);
  if (networkSheet) net = readNetworkSheet(networkSheet, net);

  const nodeSheet = wb.getWorksheet(NODES_SHEET.name);
  if (nodeSheet) net = readNodesSheet(nodeSheet, net);

  const vtSheet = wb.getWorksheet(VALUE_TABLES_SHEET.name);
  if (vtSheet) net = readValueTablesSheet(vtSheet, net);

  const vteSheet = wb.getWorksheet(VALUE_TABLE_ENTRIES_SHEET.name);
  if (vteSheet) net = readValueTableEntriesSheet(vteSheet, net);

  const msgSheet = wb.getWorksheet(MESSAGES_SHEET.name);
  if (msgSheet) net = readMessagesSheet(msgSheet, net);

  const sigSheet = wb.getWorksheet(SIGNALS_SHEET.name);
  if (sigSheet) net = readSignalsSheet(sigSheet, net);

  const attrDefSheet = wb.getWorksheet(ATTRIBUTE_DEFS_SHEET.name);
  if (attrDefSheet) net = readAttributeDefsSheet(attrDefSheet, net);

  const attrAssignSheet = wb.getWorksheet(ATTRIBUTE_ASSIGNMENTS_SHEET.name);
  if (attrAssignSheet) net = readAttributeAssignmentsSheet(attrAssignSheet, net);

  const muxExtSheet = wb.getWorksheet(MUX_EXTENSIONS_SHEET.name);
  if (muxExtSheet) net = readMuxExtensionsSheet(muxExtSheet, net);

  return injectImplicitAttributeDefs(net);
}

/** Phase 9.5: when the reader synthesizes a NmStationAddress attribute
 *  assignment (from the Node Address column) but the AttributeDef sheet
 *  doesn't declare a corresponding def, inject one. This keeps the
 *  xlsx → Network → DBC round-trip symmetric with the DBC build path
 *  which also auto-declares the well-known def. */
function injectImplicitAttributeDefs(net: Network): Network {
  const declared = new Set(net.attributeDefs.map((d) => d.name));
  const hasNmAddr = net.attributeAssignments.some(
    (a) => a.name === 'NmStationAddress' && a.target.kind === 'node',
  );
  if (!hasNmAddr || declared.has('NmStationAddress')) return net;
  return {
    ...net,
    attributeDefs: [
      ...net.attributeDefs,
      {
        name: 'NmStationAddress',
        target: 'node',
        type: { kind: 'int', min: 0, max: 255 },
        defaultValue: 0,
      },
    ],
  };
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
    // Phase 9.5: when the Node Address cell is filled, also create a
    // NmStationAddress attribute assignment so the DBC round-trip stays
    // symmetric (the DBC writer injects this exact assignment for nodes
    // that have an address).
    if (address !== undefined) {
      next = addAttributeAssignment(next, {
        name: 'NmStationAddress',
        target: { kind: 'node', nodeName: name },
        value: address,
      });
    }
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

    // Wire attribute columns into AttributeAssignment entries.
    next = wireMessageAttributes(next, id, row);
  }
  return next;
}

function wireMessageAttributes(
  net: Network,
  messageId: number,
  row: Record<string, unknown>,
): Network {
  let next = net;
  const target = { kind: 'message' as const, messageId };
  const numberKeys: ReadonlyArray<readonly [string, string]> = [
    ['cycleTime', 'GenMsgCycleTime'],
    ['startDelayTime', 'GenMsgStartDelayTime'],
    ['delayTime', 'GenMsgDelayTime'],
    ['nrOfRepetitions', 'GenMsgNrOfRepetitions'],
  ];
  for (const [field, attrName] of numberKeys) {
    const cell = row[field];
    if (cell === undefined || cell === null || cell === '') continue;
    const v = Number(cell);
    if (Number.isNaN(v)) continue;
    next = addAttributeAssignment(next, { name: attrName, target, value: v });
  }
  const stringKeys: ReadonlyArray<readonly [string, string]> = [
    ['sendType', 'GenMsgSendType'],
    ['vFrameFormat', 'VFrameFormat'],
  ];
  for (const [field, attrName] of stringKeys) {
    const cell = row[field];
    if (cell === undefined || cell === null || cell === '') continue;
    next = addAttributeAssignment(next, {
      name: attrName,
      target,
      value: String(cell),
    });
  }
  return next;
}

function readValueTablesSheet(ws: Worksheet, net: Network): Network {
  const rows = readSheetRows(ws, VALUE_TABLES_SHEET);
  let next = net;
  for (const r of rows) {
    const name = String(r['name'] ?? '').trim();
    if (!name) continue;
    next = addValueTable(next, createValueTable({ name, entries: [] }));
  }
  return next;
}

function readValueTableEntriesSheet(ws: Worksheet, net: Network): Network {
  const rows = readSheetRows(ws, VALUE_TABLE_ENTRIES_SHEET);
  const byVT = new Map<string, ValueTableEntry[]>();
  for (const r of rows) {
    const vtName = String(r['valueTableName'] ?? '').trim();
    if (!vtName) continue;
    const entry: ValueTableEntry = {
      raw: Number(r['raw']),
      name: String(r['name'] ?? '').trim(),
    };
    const list = byVT.get(vtName);
    if (list) list.push(entry);
    else byVT.set(vtName, [entry]);
  }
  if (byVT.size === 0) return net;
  const newVTs = net.valueTables.map((vt) => {
    const entries = byVT.get(vt.name);
    if (!entries) return vt;
    return createValueTable({ name: vt.name, entries });
  });
  return { ...net, valueTables: newVTs };
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
  NETWORK_SHEET,
  ATTRIBUTE_DEFS_SHEET,
  ATTRIBUTE_ASSIGNMENTS_SHEET,
  MUX_EXTENSIONS_SHEET,
};

/* --------------------------------------------------------------------------
 * Phase 9.5: extended sheets
 *
 * The Vector CANdb++ matrix export is a flat per-entity view, so a few
 * Network-level concepts (Network.version, attributeDefs, attributeAssignments,
 * message.muxExtensions) are not captured by the per-sheet readers above. We
 * model each as an additional sheet:
 *
 *   - Network:        single-row sheet with Version / BusType / Baudrate / DBName.
 *   - AttributeDef:   one row per attribute declaration.
 *   - AttributeAssignment: one row per (name, target, value) tuple.
 *   - MuxExtension:   one row per (messageId, signalName, value-list) tuple.
 *
 * The readers are tolerant: blank rows or missing sheets are no-ops; the
 * corresponding fields remain at their default. Existing round-trip tests
 * continue to pass because the new sheets are not required.
 * -------------------------------------------------------------------------- */

function readNetworkSheet(ws: Worksheet, net: Network): Network {
  // Single-row sheet: row 1 is headers, row 2 is the only data row.
  const row = ws.getRow(2);
  if (!row || row.hasValues === false) return net;
  let next: Network = net;
  const versionCell = row.getCell(1).value;
  if (versionCell !== null && versionCell !== undefined && String(versionCell).length > 0) {
    next = { ...next, version: String(versionCell) };
  }
  const busTypeCell = row.getCell(2).value;
  if (busTypeCell !== null && busTypeCell !== undefined && String(busTypeCell).length > 0) {
    next = addAttributeAssignment(next, {
      name: 'BusType',
      target: { kind: 'network' },
      value: String(busTypeCell),
    });
  }
  const baudrateCell = row.getCell(3).value;
  if (baudrateCell !== null && baudrateCell !== undefined && String(baudrateCell).length > 0) {
    const n = Number(baudrateCell);
    if (!Number.isNaN(n)) {
      next = addAttributeAssignment(next, {
        name: 'Baudrate',
        target: { kind: 'network' },
        value: n,
      });
    }
  }
  const dbNameCell = row.getCell(4).value;
  if (dbNameCell !== null && dbNameCell !== undefined && String(dbNameCell).length > 0) {
    next = addAttributeAssignment(next, {
      name: 'DBName',
      target: { kind: 'network' },
      value: String(dbNameCell),
    });
  }
  return next;
}

function readAttributeDefsSheet(ws: Worksheet, net: Network): Network {
  const rows = readSheetRows(ws, ATTRIBUTE_DEFS_SHEET);
  let next = net;
  for (const r of rows) {
    const name = String(r['name'] ?? '').trim();
    if (!name) continue;
    const targetStr = String(r['target'] ?? '').trim();
    const typeStr = String(r['type'] ?? '').trim();
    const min = r['min'] !== undefined && r['min'] !== '' ? Number(r['min']) : 0;
    const max = r['max'] !== undefined && r['max'] !== '' ? Number(r['max']) : 0;
    const valuesStr = String(r['values'] ?? '').trim();
    const defaultStr = String(r['default'] ?? '');
    const target: AttrTarget =
      targetStr === 'message' ? 'message'
        : targetStr === 'signal' ? 'signal'
          : targetStr === 'node' ? 'node'
            : 'network';
    let type: AttrType;
    if (typeStr === 'int') type = { kind: 'int', min, max };
    else if (typeStr === 'hex') type = { kind: 'hex', min, max };
    else if (typeStr === 'float') type = { kind: 'float', min, max };
    else if (typeStr === 'string') type = { kind: 'string' };
    else {
      // ENUM (or default): split quoted values out of "values" cell.
      const values: string[] = [];
      const re = /"([^"]*)"/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(valuesStr)) !== null) {
        if (m[1] !== undefined) values.push(m[1]);
      }
      type = { kind: 'enum', values };
    }
    const defaultValue: number | string =
      defaultStr.length === 0 ? 0 : isNaN(Number(defaultStr)) ? defaultStr : Number(defaultStr);
    next = addAttributeDef(next, { name, target, type, defaultValue });
  }
  return next;
}

function readAttributeAssignmentsSheet(ws: Worksheet, net: Network): Network {
  const rows = readSheetRows(ws, ATTRIBUTE_ASSIGNMENTS_SHEET);
  let next = net;
  for (const r of rows) {
    const name = String(r['name'] ?? '').trim();
    if (!name) continue;
    const targetKind = String(r['targetKind'] ?? '').trim();
    const targetRef = String(r['targetRef'] ?? '').trim();
    const valueStr = String(r['value'] ?? '');
    const value: number | string = isNaN(Number(valueStr)) ? valueStr : Number(valueStr);
    let target: AttributeTargetRef | null = null;
    if (targetKind === 'network') {
      target = { kind: 'network' };
    } else if (targetKind === 'message') {
      const id = parseHexOrDec(targetRef);
      if (id !== undefined) target = { kind: 'message', messageId: id };
    } else if (targetKind === 'signal') {
      const sep = targetRef.indexOf('|');
      if (sep > 0) {
        const idStr = targetRef.slice(0, sep);
        const sigName = targetRef.slice(sep + 1);
        const id = parseHexOrDec(idStr);
        if (id !== undefined) target = { kind: 'signal', messageId: id, signalName: sigName };
      }
    } else if (targetKind === 'node') {
      target = { kind: 'node', nodeName: targetRef };
    }
    if (target === null) continue;
    next = addAttributeAssignment(next, { name, target, value });
  }
  return next;
}

function readMuxExtensionsSheet(ws: Worksheet, net: Network): Network {
  const rows = readSheetRows(ws, MUX_EXTENSIONS_SHEET);
  let next = net;
  for (const r of rows) {
    const idStr = String(r['messageId'] ?? '').trim();
    if (!idStr) continue;
    const messageId = parseHexOrDec(idStr);
    if (messageId === undefined) continue;
    const sigName = String(r['signalName'] ?? '').trim();
    if (!sigName) continue;
    const muxValuesStr = String(r['muxValues'] ?? '').trim();
    const muxValues = muxValuesStr
      .split(/\s+/)
      .map((s) => Number(s))
      .filter((v) => !Number.isNaN(v));
    const idx = next.messages.findIndex((m) => m.id === messageId);
    if (idx < 0) continue;
    const orig = next.messages[idx];
    if (!orig) continue;
    const existing = orig.muxExtensions ? new Map(orig.muxExtensions) : new Map<string, readonly number[]>();
    existing.set(sigName, muxValues);
    const updated = createMessage({ ...orig, muxExtensions: existing });
    const newMessages = [...next.messages];
    newMessages[idx] = updated;
    next = { ...next, messages: newMessages };
  }
  return next;
}
