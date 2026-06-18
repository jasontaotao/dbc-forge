import { describe, it, expect } from 'vitest';
import { createValueTable, findValue } from '../../src/model/value-table.js';

describe('ValueTable', () => {
  it('createValueTable stores name + entries', () => {
    const vt = createValueTable({
      name: 'VT_OffOn',
      entries: [{ raw: 0, name: 'Off' }, { raw: 1, name: 'On' }],
    });
    expect(vt.name).toBe('VT_OffOn');
    expect(vt.entries).toHaveLength(2);
  });

  it('findValue returns matching entry', () => {
    const vt = createValueTable({ name: 'X', entries: [{ raw: 5, name: 'A' }] });
    expect(findValue(vt, 5)?.name).toBe('A');
    expect(findValue(vt, 99)).toBeUndefined();
  });
});