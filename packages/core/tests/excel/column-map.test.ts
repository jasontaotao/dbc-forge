import { describe, it, expect } from 'vitest';

import { NODES_SHEET, MESSAGES_SHEET, SIGNALS_SHEET, VALUE_TABLES_SHEET, VALUE_TABLE_ENTRIES_SHEET, getColumnIndex } from '../../src/excel/column-map.js';

describe('column-map', () => {
  it('NODES_SHEET declares the 3 standard columns', () => {
    expect(NODES_SHEET.name).toBe('Node');
    expect(NODES_SHEET.columns).toContainEqual({ header: 'Node Name', field: 'name', kind: 'string' });
    expect(NODES_SHEET.columns).toContainEqual({ header: 'Node Address', field: 'address', kind: 'number' });
    expect(NODES_SHEET.columns).toContainEqual({ header: 'Comment', field: 'comment', kind: 'string' });
  });

  it('MESSAGES_SHEET declares 11 standard columns', () => {
    const headers = MESSAGES_SHEET.columns.map((c) => c.header);
    expect(headers).toContain('Message Name');
    expect(headers).toContain('Message ID (hex)');
    expect(headers).toContain('Message Length');
    expect(headers).toContain('Transmitter');
    expect(headers).toContain('Cycle Time [ms]');
    expect(headers).toContain('Send Type');
  });

  it('SIGNALS_SHEET declares mux-related columns', () => {
    const headers = SIGNALS_SHEET.columns.map((c) => c.header);
    expect(headers).toContain('Multiplex');
    expect(headers).toContain('Mux Value');
    expect(headers).toContain('Mux Extended');
  });

  it('VALUE_TABLES_SHEET declares VT name + comment', () => {
    expect(VALUE_TABLES_SHEET.name).toBe('ValueTable');
    const headers = VALUE_TABLES_SHEET.columns.map((c) => c.header);
    expect(headers).toContain('Value Table Name');
    expect(headers).toContain('Comment');
  });

  it('VALUE_TABLE_ENTRIES_SHEET declares VT name + raw + name', () => {
    expect(VALUE_TABLE_ENTRIES_SHEET.name).toBe('ValueTableEntry');
    const headers = VALUE_TABLE_ENTRIES_SHEET.columns.map((c) => c.header);
    expect(headers).toContain('Value Table Name');
    expect(headers).toContain('Raw Value');
    expect(headers).toContain('Value Name');
  });

  it('getColumnIndex resolves header to 1-based column number', () => {
    expect(getColumnIndex(MESSAGES_SHEET, 'Message Name')).toBe(1);
    expect(getColumnIndex(MESSAGES_SHEET, 'Transmitter')).toBe(4);
    expect(getColumnIndex(SIGNALS_SHEET, 'Mux Value')).toBe(4);
  });

  it('getColumnIndex throws on unknown header', () => {
    expect(() => getColumnIndex(MESSAGES_SHEET, 'No Such Column')).toThrowError(/not found/);
  });
});
