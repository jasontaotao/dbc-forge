/**
 * ⚠️1 frozen 2026-06-18: Vector CANdb++ 8.2 Excel export schema.
 *
 * Each sheet is a list of column mappings. The Excel reader uses this to
 * locate cells; the Excel writer uses it to emit headers in order.
 *
 * Sheet structure: 5 sheets. Row 1 is the header row. Row 2+ are data.
 *
 * Mux encoding in SIGNALS_SHEET:
 *   - 'Multiplex' column: empty (plain) | 'Multiplexor' | 'Muxed' | 'Extended'
 *   - 'Mux Value' column: integer 0..N for Muxed/Extended, blank otherwise
 *   - 'Mux Extended' column: 1/0 flag for Extended (1 = extended)
 *   - The signal is rendered multiplexed iff Multiplex == 'Multiplexor' or 'Muxed'.
 *
 * Value Table encoding in VALUE_TABLES_SHEET + VALUE_TABLE_ENTRIES_SHEET:
 *   - VALUE_TABLES_SHEET: one row per VT: VT Name | Comment
 *   - VALUE_TABLE_ENTRIES_SHEET: one row per (VT, raw, name): VT Name | Raw Value | Value Name
 *   - Signal-to-VT binding is in SIGNALS_SHEET column 'Value Table Name'.
 *
 * Backout criterion: If a real Vector CANdb++ export differs in column order or
 * sheet count, amend this map and re-derive reader/writer from the corrected
 * map. Do NOT patch the reader to special-case missing columns; instead fix
 * the map first.
 */

export type ColumnKind =
  | 'string'
  | 'number'
  | 'enum'
  | 'signed'
  | 'unsigned'
  | 'float'
  | 'hex'
  | 'bool';

export interface ColumnMapping {
  readonly header: string;
  readonly field: string;
  readonly kind?: ColumnKind;
}

export interface SheetMapping {
  readonly name: string;
  readonly columns: readonly ColumnMapping[];
}

export const NODES_SHEET: SheetMapping = {
  name: 'Node',
  columns: [
    { header: 'Node Name', field: 'name', kind: 'string' },
    { header: 'Node Address', field: 'address', kind: 'number' },
    { header: 'Comment', field: 'comment', kind: 'string' },
  ],
};

export const MESSAGES_SHEET: SheetMapping = {
  name: 'Message',
  columns: [
    { header: 'Message Name', field: 'name', kind: 'string' },
    { header: 'Message ID (hex)', field: 'id', kind: 'hex' },
    { header: 'Message Length', field: 'dlc', kind: 'number' },
    { header: 'Transmitter', field: 'transmitter', kind: 'string' },
    { header: 'Cycle Time [ms]', field: 'cycleTime', kind: 'number' },
    { header: 'Send Type', field: 'sendType', kind: 'enum' },
    { header: 'Start Delay Time [ms]', field: 'startDelayTime', kind: 'number' },
    { header: 'Delay Time [ms]', field: 'delayTime', kind: 'number' },
    { header: 'Number of Repetitions', field: 'nrOfRepetitions', kind: 'number' },
    { header: 'VFrameFormat', field: 'vFrameFormat', kind: 'enum' },
    { header: 'Comment', field: 'comment', kind: 'string' },
  ],
};

export const SIGNALS_SHEET: SheetMapping = {
  name: 'Signal',
  columns: [
    { header: 'Message Name', field: 'messageName', kind: 'string' },
    { header: 'Signal Name', field: 'name', kind: 'string' },
    { header: 'Multiplex', field: 'multiplexed', kind: 'enum' },
    { header: 'Mux Value', field: 'muxValue', kind: 'number' },
    { header: 'Mux Extended', field: 'muxExtended', kind: 'bool' },
    { header: 'Start Bit', field: 'startBit', kind: 'number' },
    { header: 'Signal Length', field: 'length', kind: 'number' },
    { header: 'Byte Order', field: 'byteOrder', kind: 'enum' },
    { header: 'Value Type', field: 'valueType', kind: 'enum' },
    { header: 'Factor', field: 'factor', kind: 'float' },
    { header: 'Offset', field: 'offset', kind: 'float' },
    { header: 'Minimum', field: 'min', kind: 'float' },
    { header: 'Maximum', field: 'max', kind: 'float' },
    { header: 'Unit', field: 'unit', kind: 'string' },
    { header: 'Value Table Name', field: 'valueTable', kind: 'string' },
    { header: 'Receivers', field: 'receivers', kind: 'string' },
    { header: 'GenSigStartValue', field: 'genSigStartValue', kind: 'float' },
    { header: 'GenSigInactiveValue', field: 'genSigInactiveValue', kind: 'float' },
    { header: 'GenSigTimeoutValue', field: 'genSigTimeoutValue', kind: 'float' },
    { header: 'Comment', field: 'comment', kind: 'string' },
  ],
};

export const VALUE_TABLES_SHEET: SheetMapping = {
  name: 'ValueTable',
  columns: [
    { header: 'Value Table Name', field: 'name', kind: 'string' },
    { header: 'Comment', field: 'comment', kind: 'string' },
  ],
};

export const VALUE_TABLE_ENTRIES_SHEET: SheetMapping = {
  name: 'ValueTableEntry',
  columns: [
    { header: 'Value Table Name', field: 'valueTableName', kind: 'string' },
    { header: 'Raw Value', field: 'raw', kind: 'number' },
    { header: 'Value Name', field: 'name', kind: 'string' },
  ],
};

export const NETWORK_SHEET: SheetMapping = {
  name: 'Network',
  columns: [
    { header: 'Version', field: 'version', kind: 'string' },
    { header: 'BusType', field: 'busType', kind: 'enum' },
    { header: 'Baudrate', field: 'baudrate', kind: 'number' },
    { header: 'DBName', field: 'dbName', kind: 'string' },
  ],
};

export const ATTRIBUTE_DEFS_SHEET: SheetMapping = {
  name: 'AttributeDef',
  columns: [
    { header: 'Name', field: 'name', kind: 'string' },
    { header: 'Target', field: 'target', kind: 'enum' },
    { header: 'Type', field: 'type', kind: 'enum' },
    { header: 'Min', field: 'min', kind: 'number' },
    { header: 'Max', field: 'max', kind: 'number' },
    { header: 'Values', field: 'values', kind: 'string' },
    { header: 'Default', field: 'default', kind: 'string' },
  ],
};

export const ATTRIBUTE_ASSIGNMENTS_SHEET: SheetMapping = {
  name: 'AttributeAssignment',
  columns: [
    { header: 'Name', field: 'name', kind: 'string' },
    { header: 'Target Kind', field: 'targetKind', kind: 'enum' },
    { header: 'Target Ref', field: 'targetRef', kind: 'string' },
    { header: 'Value', field: 'value', kind: 'string' },
  ],
};

export const MUX_EXTENSIONS_SHEET: SheetMapping = {
  name: 'MuxExtension',
  columns: [
    { header: 'Message ID (hex)', field: 'messageId', kind: 'hex' },
    { header: 'Signal Name', field: 'signalName', kind: 'string' },
    { header: 'Mux Values', field: 'muxValues', kind: 'string' },
  ],
};

export const ALL_SHEETS = [
  NETWORK_SHEET,
  NODES_SHEET,
  MESSAGES_SHEET,
  SIGNALS_SHEET,
  VALUE_TABLES_SHEET,
  VALUE_TABLE_ENTRIES_SHEET,
  ATTRIBUTE_DEFS_SHEET,
  ATTRIBUTE_ASSIGNMENTS_SHEET,
  MUX_EXTENSIONS_SHEET,
] as const;

export function getColumnIndex(sheet: SheetMapping, header: string): number {
  const idx = sheet.columns.findIndex((c) => c.header === header);
  if (idx < 0) {
    throw new Error(`column "${header}" not found in sheet "${sheet.name}"`);
  }
  return idx + 1;
}
