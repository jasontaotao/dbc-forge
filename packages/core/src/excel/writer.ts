// Excel writer for the Vector CANdb++ 8.2 matrix export. Inverse of the reader.
//
// Strategy: build a fresh Workbook with one sheet per SheetMapping. Each sheet
// gets a header row derived from SheetMapping.columns, then one row per Network
// element. The schema is the same column-map the reader consumes, so a buffer
// produced here can be fed back through parseExcelAsync for round-trip tests.

// exceljs exports a CJS object; the runtime `import ExcelJS from 'exceljs'`
// gives us the workbook constructor via Node's CJS-default interop. The
// eslint-plugin-import rules flag this as a missing default export, but
// the import works at runtime under NodeNext resolution.
// eslint-disable-next-line import/default, import/no-named-as-default-member
import ExcelJS, { type Workbook as WorkbookType } from 'exceljs';

const { Workbook } = ExcelJS;
type Workbook = WorkbookType;

import type { Network } from '../model/network.js';
import type { Signal } from '../model/signal.js';

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
} from './column-map.js';

/** Render a Network into a Vector CANdb++ 8.2 xlsx Buffer. */
export async function writeExcel(net: Network): Promise<Buffer> {
  const wb = new Workbook();
  writeNetworkSheet(wb, net);
  writeNodesSheet(wb, net);
  writeMessagesSheet(wb, net);
  writeSignalsSheet(wb, net);
  writeValueTablesSheet(wb, net);
  writeValueTableEntriesSheet(wb, net);
  writeAttributeDefsSheet(wb, net);
  writeAttributeAssignmentsSheet(wb, net);
  writeMuxExtensionsSheet(wb, net);
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

/** Emit the Network sheet (single data row) with version + bus attributes. */
function writeNetworkSheet(wb: Workbook, net: Network): void {
  const ws = wb.addWorksheet(NETWORK_SHEET.name);
  ws.addRow(NETWORK_SHEET.columns.map((c) => c.header));
  const busType = lookupNetworkAttr(net, 'BusType');
  const baudrate = lookupNetworkAttr(net, 'Baudrate');
  const dbName = lookupNetworkAttr(net, 'DBName');
  ws.addRow([net.version, busType ?? '', baudrate ?? '', dbName ?? '']);
}

function lookupNetworkAttr(net: Network, name: string): string | number | undefined {
  const a = net.attributeAssignments.find((x) => x.name === name && x.target.kind === 'network');
  return a?.value;
}

/** Emit the AttributeDef sheet: one row per AttributeDef, plus the
 *  well-known defs that the DBC build path auto-injects (NmStationAddress
 *  for nodes with addresses) so the xlsx round-trip is symmetric. */
function writeAttributeDefsSheet(wb: Workbook, net: Network): void {
  const ws = wb.addWorksheet(ATTRIBUTE_DEFS_SHEET.name);
  ws.addRow(ATTRIBUTE_DEFS_SHEET.columns.map((c) => c.header));
  const declared = new Set(net.attributeDefs.map((d) => d.name));
  if (!declared.has('NmStationAddress') && net.nodes.some((n) => n.address !== undefined)) {
    ws.addRow(
      ATTRIBUTE_DEFS_SHEET.columns.map((c) =>
        resolveAttributeDefColumn(
          {
            name: 'NmStationAddress',
            target: 'node',
            type: { kind: 'int', min: 0, max: 255 },
            defaultValue: 0,
          },
          c.field,
        ),
      ),
    );
  }
  for (const def of net.attributeDefs) {
    ws.addRow(ATTRIBUTE_DEFS_SHEET.columns.map((c) => resolveAttributeDefColumn(def, c.field)));
  }
}

function resolveAttributeDefColumn(
  def: Network['attributeDefs'][number],
  field: string,
): string | number {
  switch (field) {
    case 'name':
      return def.name;
    case 'target':
      return def.target;
    case 'type':
      return def.type.kind;
    case 'min':
      if (def.type.kind === 'int' || def.type.kind === 'hex' || def.type.kind === 'float') {
        return def.type.min;
      }
      return '';
    case 'max':
      if (def.type.kind === 'int' || def.type.kind === 'hex' || def.type.kind === 'float') {
        return def.type.max;
      }
      return '';
    case 'values':
      if (def.type.kind === 'enum') {
        return def.type.values.map((v) => `"${v}"`).join(',');
      }
      return '';
    case 'default':
      return def.defaultValue;
    default:
      return '';
  }
}

/** Emit the AttributeAssignment sheet: one row per AttributeAssignment. */
function writeAttributeAssignmentsSheet(wb: Workbook, net: Network): void {
  const ws = wb.addWorksheet(ATTRIBUTE_ASSIGNMENTS_SHEET.name);
  ws.addRow(ATTRIBUTE_ASSIGNMENTS_SHEET.columns.map((c) => c.header));
  for (const a of net.attributeAssignments) {
    ws.addRow(
      ATTRIBUTE_ASSIGNMENTS_SHEET.columns.map((c) => resolveAttributeAssignmentColumn(a, c.field)),
    );
  }
}

function resolveAttributeAssignmentColumn(
  a: Network['attributeAssignments'][number],
  field: string,
): string {
  switch (field) {
    case 'name':
      return a.name;
    case 'targetKind':
      return a.target.kind;
    case 'targetRef':
      if (a.target.kind === 'network') return '';
      if (a.target.kind === 'message') return `0x${a.target.messageId.toString(16).toUpperCase()}`;
      if (a.target.kind === 'signal')
        return `0x${a.target.messageId.toString(16).toUpperCase()}|${a.target.signalName}`;
      return a.target.nodeName;
    case 'value':
      return String(a.value);
    default:
      return '';
  }
}

/** Emit the MuxExtension sheet: one row per (messageId, signalName, values). */
function writeMuxExtensionsSheet(wb: Workbook, net: Network): void {
  const ws = wb.addWorksheet(MUX_EXTENSIONS_SHEET.name);
  ws.addRow(MUX_EXTENSIONS_SHEET.columns.map((c) => c.header));
  for (const m of net.messages) {
    if (m.muxExtensions) {
      for (const [sigName, values] of m.muxExtensions) {
        ws.addRow([formatHexId(m.id), sigName, values.join(' ')]);
      }
    }
  }
}

/** Emit the ValueTable sheet: one row per VT (name + empty comment). */
function writeValueTablesSheet(wb: Workbook, net: Network): void {
  const ws = wb.addWorksheet(VALUE_TABLES_SHEET.name);
  ws.addRow(VALUE_TABLES_SHEET.columns.map((c) => c.header));
  for (const vt of net.valueTables) {
    ws.addRow([vt.name, '']);
  }
}

/** Emit the ValueTableEntry sheet: one row per (VT, raw, name) entry. */
function writeValueTableEntriesSheet(wb: Workbook, net: Network): void {
  const ws = wb.addWorksheet(VALUE_TABLE_ENTRIES_SHEET.name);
  ws.addRow(VALUE_TABLE_ENTRIES_SHEET.columns.map((c) => c.header));
  for (const vt of net.valueTables) {
    for (const entry of vt.entries) {
      ws.addRow([vt.name, entry.raw, entry.name]);
    }
  }
}

/** Emit the Node sheet from net.nodes. Header + one row per node. */
function writeNodesSheet(wb: Workbook, net: Network): void {
  const ws = wb.addWorksheet(NODES_SHEET.name);
  ws.addRow(NODES_SHEET.columns.map((c) => c.header));
  for (const node of net.nodes) {
    ws.addRow(
      NODES_SHEET.columns.map((c) => {
        switch (c.field) {
          case 'name':
            return node.name;
          case 'address':
            return node.address ?? '';
          case 'comment':
            return node.comment ?? '';
          default:
            return '';
        }
      }),
    );
  }
}

/** Emit the Message sheet. Wire attributes (Cycle Time / Send Type / etc.) are looked up via attributeAssignments. */
function writeMessagesSheet(wb: Workbook, net: Network): void {
  const ws = wb.addWorksheet(MESSAGES_SHEET.name);
  ws.addRow(MESSAGES_SHEET.columns.map((c) => c.header));
  for (const m of net.messages) {
    ws.addRow(MESSAGES_SHEET.columns.map((c) => resolveMessageColumn(net, m, c.field)));
  }
}

function resolveMessageColumn(
  net: Network,
  m: Network['messages'][number],
  field: string,
): string | number {
  switch (field) {
    case 'name':
      return m.name;
    case 'id':
      return formatHexId(m.id);
    case 'dlc':
      return m.dlc;
    case 'transmitter':
      return m.transmitter;
    case 'cycleTime':
      return lookupMessageAttr(net, m.id, 'GenMsgCycleTime') ?? '';
    case 'sendType':
      return lookupMessageAttr(net, m.id, 'GenMsgSendType') ?? '';
    case 'startDelayTime':
      return lookupMessageAttr(net, m.id, 'GenMsgStartDelayTime') ?? '';
    case 'delayTime':
      return lookupMessageAttr(net, m.id, 'GenMsgDelayTime') ?? '';
    case 'nrOfRepetitions':
      return lookupMessageAttr(net, m.id, 'GenMsgNrOfRepetitions') ?? '';
    case 'vFrameFormat':
      return lookupMessageAttr(net, m.id, 'VFrameFormat') ?? '';
    case 'comment':
      return m.comment ?? '';
    default:
      return '';
  }
}

function lookupMessageAttr(
  net: Network,
  messageId: number,
  name: string,
): string | number | undefined {
  const a = net.attributeAssignments.find(
    (x) => x.name === name && x.target.kind === 'message' && x.target.messageId === messageId,
  );
  return a?.value;
}

function lookupSignalAttr(
  net: Network,
  messageId: number,
  signalName: string,
  name: string,
): string | number | undefined {
  const a = net.attributeAssignments.find(
    (x) =>
      x.name === name &&
      x.target.kind === 'signal' &&
      x.target.messageId === messageId &&
      x.target.signalName === signalName,
  );
  return a?.value;
}

/** Render a CAN ID as `0x` + upper-case hex, padded to 3 chars for 11-bit and full 8 for 29-bit. */
function formatHexId(id: number): string {
  const hex = id.toString(16).toUpperCase();
  if (id <= 0x7ff) return '0x' + hex.padStart(3, '0');
  return '0x' + hex;
}

/** Emit the Signal sheet. One row per signal. Mux encoding: 'Multiplexor' / 'Muxed' / 'Extended'. */
function writeSignalsSheet(wb: Workbook, net: Network): void {
  const ws = wb.addWorksheet(SIGNALS_SHEET.name);
  ws.addRow(SIGNALS_SHEET.columns.map((c) => c.header));
  for (const m of net.messages) {
    for (const s of m.signals) {
      ws.addRow(SIGNALS_SHEET.columns.map((c) => resolveSignalColumn(net, m.id, s, c.field)));
    }
  }
}

function resolveSignalColumn(
  net: Network,
  messageId: number,
  s: Signal,
  field: string,
): string | number {
  switch (field) {
    case 'messageName':
      return net.messages.find((m) => m.id === messageId)?.name ?? '';
    case 'name':
      return s.name;
    case 'multiplexed':
      return multiplexKindLabel(s);
    case 'muxValue':
      if (s.multiplexed.kind === 'Muxed' || s.multiplexed.kind === 'ExtendedMuxed') {
        return s.multiplexed.value;
      }
      return '';
    case 'muxExtended':
      return s.multiplexed.kind === 'ExtendedMuxed' ? 1 : 0;
    case 'startBit':
      return s.startBit;
    case 'length':
      return s.length;
    case 'byteOrder':
      return s.byteOrder === 'little-endian' ? '1' : '0';
    case 'valueType':
      return encodeValueType(s.valueType);
    case 'factor':
      return s.factor;
    case 'offset':
      return s.offset;
    case 'min':
      return s.min;
    case 'max':
      return s.max;
    case 'unit':
      return s.unit;
    case 'valueTable':
      return s.valueTable ?? '';
    case 'receivers':
      return s.receivers.join(',');
    case 'genSigStartValue':
      return lookupSignalAttr(net, messageId, s.name, 'GenSigStartValue') ?? '';
    case 'genSigInactiveValue':
      return lookupSignalAttr(net, messageId, s.name, 'GenSigInactiveValue') ?? '';
    case 'genSigTimeoutValue':
      return lookupSignalAttr(net, messageId, s.name, 'GenSigTimeoutValue') ?? '';
    case 'comment':
      return s.comment ?? '';
    default:
      return '';
  }
}

function multiplexKindLabel(s: Signal): string {
  switch (s.multiplexed.kind) {
    case 'Plain':
      return '';
    case 'Multiplexor':
      return 'Multiplexor';
    case 'Muxed':
      return 'Muxed';
    case 'ExtendedMuxed':
      return 'Extended';
  }
}

function encodeValueType(v: Signal['valueType']): string {
  switch (v) {
    case 'unsigned':
      return '+';
    case 'signed':
      return '-';
    case 'float':
      return 'float';
    case 'double':
      return 'double';
  }
}

// Internal helpers re-exported to keep the test surface area consistent.
export const _internal = {
  writeNodesSheet,
  writeMessagesSheet,
  writeSignalsSheet,
  writeValueTablesSheet,
  writeValueTableEntriesSheet,
};
