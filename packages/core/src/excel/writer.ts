// Excel writer for the Vector CANdb++ 8.2 matrix export. Inverse of the reader.
//
// Strategy: build a fresh Workbook with one sheet per SheetMapping. Each sheet
// gets a header row derived from SheetMapping.columns, then one row per Network
// element. The schema is the same column-map the reader consumes, so a buffer
// produced here can be fed back through parseExcelAsync for round-trip tests.

import ExcelJS from 'exceljs';

import type { Network } from '../model/network.js';

import {
  NODES_SHEET,
  MESSAGES_SHEET,
  SIGNALS_SHEET,
  VALUE_TABLES_SHEET,
  VALUE_TABLE_ENTRIES_SHEET,
  type SheetMapping,
} from './column-map.js';

/** Render a Network into a Vector CANdb++ 8.2 xlsx Buffer. */
export async function writeExcel(net: Network): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  writeNodesSheet(wb, net);
  // Tasks 5.2-5.5 will add more sheets
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
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

// Internal helpers re-exported to keep the test surface area consistent.
export const _internal = { writeNodesSheet };

/** Build a row of values for one record, given a SheetMapping and a field resolver. */
export function _buildRow<V>(
  sheet: SheetMapping,
  resolve: (field: string) => string | number | boolean,
): Array<string | number | boolean> {
  return sheet.columns.map((c) => resolve(c.field));
}