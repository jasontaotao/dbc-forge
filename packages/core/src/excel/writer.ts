// Excel writer for the Vector CANdb++ 8.2 matrix export. Inverse of the reader.
//
// Strategy: build a fresh Workbook with one sheet per SheetMapping. Each sheet
// gets a header row derived from SheetMapping.columns, then one row per Network
// element. The schema is the same column-map the reader consumes, so a buffer
// produced here can be fed back through parseExcelAsync for round-trip tests.

import ExcelJS from 'exceljs';

import type { Network } from '../model/network.js';
import type { Signal } from '../model/signal.js';

import {
  NODES_SHEET,
  MESSAGES_SHEET,
  SIGNALS_SHEET,
  VALUE_TABLES_SHEET,
  VALUE_TABLE_ENTRIES_SHEET,
} from './column-map.js';

/** Render a Network into a Vector CANdb++ 8.2 xlsx Buffer. */
export async function writeExcel(net: Network): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  writeNodesSheet(wb, net);
  writeMessagesSheet(wb, net);
  writeSignalsSheet(wb, net);
  writeValueTablesSheet(wb, net);
  writeValueTableEntriesSheet(wb, net);
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

/** Emit the ValueTable sheet: one row per VT (name + empty comment). */
function writeValueTablesSheet(wb: ExcelJS.Workbook, net: Network): void {
  const ws = wb.addWorksheet(VALUE_TABLES_SHEET.name);
  ws.addRow(VALUE_TABLES_SHEET.columns.map((c) => c.header));
  for (const vt of net.valueTables) {
    ws.addRow([vt.name, '']);
  }
}

/** Emit the ValueTableEntry sheet: one row per (VT, raw, name) entry. */
function writeValueTableEntriesSheet(wb: ExcelJS.Workbook, net: Network): void {
  const ws = wb.addWorksheet(VALUE_TABLE_ENTRIES_SHEET.name);
  ws.addRow(VALUE_TABLE_ENTRIES_SHEET.columns.map((c) => c.header));
  for (const vt of net.valueTables) {
    for (const entry of vt.entries) {
      ws.addRow([vt.name, entry.raw, entry.name]);
    }
  }
}

/** Emit the Node sheet from net.nodes. Header + one row per node. */
function writeNodesSheet(wb: ExcelJS.Workbook, net: Network): void {
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
function writeMessagesSheet(wb: ExcelJS.Workbook, net: Network): void {
  const ws = wb.addWorksheet(MESSAGES_SHEET.name);
  ws.addRow(MESSAGES_SHEET.columns.map((c) => c.header));
  for (const m of net.messages) {
    ws.addRow(
      MESSAGES_SHEET.columns.map((c) => resolveMessageColumn(net, m, c.field)),
    );
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

function lookupMessageAttr(net: Network, messageId: number, name: string): string | number | undefined {
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
function writeSignalsSheet(wb: ExcelJS.Workbook, net: Network): void {
  const ws = wb.addWorksheet(SIGNALS_SHEET.name);
  ws.addRow(SIGNALS_SHEET.columns.map((c) => c.header));
  for (const m of net.messages) {
    for (const s of m.signals) {
      ws.addRow(
        SIGNALS_SHEET.columns.map((c) => resolveSignalColumn(net, m.id, s, c.field)),
      );
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