import { describe, it, expect } from 'vitest';

import { createMessage } from '../../../src/model/message.js';
import { createNetwork, addNode, addMessage, addValueTable } from '../../../src/model/network.js';
import { createNode } from '../../../src/model/node.js';
import { createSignal } from '../../../src/model/signal.js';
import { createValueTable } from '../../../src/model/value-table.js';
import { vtSignalBoundExists } from '../../../src/validate/rules/vt-signal-bound-exists.js';

describe('vt-signal-bound-exists', () => {
  it('passes when signal.valueTable exists in network', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(
      net,
      createMessage({
        id: 1,
        name: 'M',
        dlc: 8,
        transmitter: 'BCM',
        signals: [
          createSignal({
            name: 'S',
            startBit: 0,
            length: 8,
            byteOrder: 'little-endian',
            valueType: 'unsigned',
            factor: 1,
            offset: 0,
            min: 0,
            max: 1,
            unit: '',
            receivers: [],
            valueTable: 'VT1',
          }),
        ],
      }),
    );
    net = addValueTable(net, createValueTable({ name: 'VT1', entries: [{ raw: 0, name: 'Off' }] }));
    expect(vtSignalBoundExists.check(net)).toHaveLength(0);
  });

  it('passes when signal has no valueTable', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(
      net,
      createMessage({
        id: 1,
        name: 'M',
        dlc: 8,
        transmitter: 'BCM',
        signals: [
          createSignal({
            name: 'S',
            startBit: 0,
            length: 8,
            byteOrder: 'little-endian',
            valueType: 'unsigned',
            factor: 1,
            offset: 0,
            min: 0,
            max: 1,
            unit: '',
            receivers: [],
          }),
        ],
      }),
    );
    expect(vtSignalBoundExists.check(net)).toHaveLength(0);
  });

  it('fires when signal.valueTable is unknown', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(
      net,
      createMessage({
        id: 1,
        name: 'M',
        dlc: 8,
        transmitter: 'BCM',
        signals: [
          createSignal({
            name: 'S',
            startBit: 0,
            length: 8,
            byteOrder: 'little-endian',
            valueType: 'unsigned',
            factor: 1,
            offset: 0,
            min: 0,
            max: 1,
            unit: '',
            receivers: [],
            valueTable: 'VT_Ghost',
          }),
        ],
      }),
    );
    const issues = vtSignalBoundExists.check(net);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.rule).toBe('vt.signal-bound-exists');
    expect(issues[0]!.severity).toBe('error');
  });
});
