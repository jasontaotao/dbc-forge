import { describe, it, expect } from 'vitest';

import {
  createNetwork,
  addValueTable,
} from '../../../src/model/network.js';
import { createValueTable } from '../../../src/model/value-table.js';
import { vtDuplicateRawValue } from '../../../src/validate/rules/vt-duplicate-raw-value.js';

describe('vt-duplicate-raw-value', () => {
  it('passes when no value table has duplicate raw values', () => {
    let net = createNetwork({ version: '1.0' });
    net = addValueTable(net, createValueTable({
      name: 'VT1',
      entries: [{ raw: 0, name: 'Off' }, { raw: 1, name: 'On' }],
    }));
    expect(vtDuplicateRawValue.check(net)).toHaveLength(0);
  });

  it('fires when one value table has duplicate raw values', () => {
    let net = createNetwork({ version: '1.0' });
    net = addValueTable(net, createValueTable({
      name: 'VT1',
      entries: [{ raw: 0, name: 'Off' }, { raw: 0, name: 'Dup' }],
    }));
    const issues = vtDuplicateRawValue.check(net);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.rule).toBe('vt.duplicate-raw-value');
    expect(issues[0]!.severity).toBe('error');
  });
});
