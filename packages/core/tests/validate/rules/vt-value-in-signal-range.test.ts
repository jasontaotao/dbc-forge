import { describe, it, expect } from 'vitest';

import { createMessage } from '../../../src/model/message.js';
import {
  createNetwork,
  addNode,
  addMessage,
  addValueTable,
} from '../../../src/model/network.js';
import { createNode } from '../../../src/model/node.js';
import { createSignal } from '../../../src/model/signal.js';
import { createValueTable } from '../../../src/model/value-table.js';
import { vtValueInSignalRange } from '../../../src/validate/rules/vt-value-in-signal-range.js';

describe('vt-value-in-signal-range', () => {
  it('passes when all raw values fit within [0, 2^length - 1]', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({
      id: 1, name: 'M', dlc: 8, transmitter: 'BCM',
      signals: [createSignal({
        name: 'S', startBit: 0, length: 2, byteOrder: 'little-endian',
        valueType: 'unsigned', factor: 1, offset: 0, min: 0, max: 3, unit: '', receivers: [],
        valueTable: 'VT1',
      })],
    }));
    net = addValueTable(net, createValueTable({
      name: 'VT1',
      entries: [{ raw: 0, name: 'Off' }, { raw: 1, name: 'On' }, { raw: 2, name: 'Auto' }],
    }));
    expect(vtValueInSignalRange.check(net)).toHaveLength(0);
  });

  it('fires when a raw value is out of range', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({
      id: 1, name: 'M', dlc: 8, transmitter: 'BCM',
      signals: [createSignal({
        name: 'S', startBit: 0, length: 2, byteOrder: 'little-endian',
        valueType: 'unsigned', factor: 1, offset: 0, min: 0, max: 3, unit: '', receivers: [],
        valueTable: 'VT1',
      })],
    }));
    net = addValueTable(net, createValueTable({
      name: 'VT1',
      entries: [{ raw: 0, name: 'Off' }, { raw: 4, name: 'OutOfRange' }],
    }));
    const issues = vtValueInSignalRange.check(net);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.rule).toBe('vt.value-in-signal-range');
    expect(issues[0]!.severity).toBe('error');
  });
});
