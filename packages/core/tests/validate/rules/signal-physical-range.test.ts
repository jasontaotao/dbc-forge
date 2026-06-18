import { describe, it, expect } from 'vitest';

import { createMessage } from '../../../src/model/message.js';
import { createNetwork, addNode, addMessage } from '../../../src/model/network.js';
import { createNode } from '../../../src/model/node.js';
import { createSignal } from '../../../src/model/signal.js';
import { signalPhysicalRange } from '../../../src/validate/rules/signal-physical-range.js';

describe('signal-physical-range', () => {
  it('passes when min <= max', () => {
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
            min: -10,
            max: 100,
            unit: '',
            receivers: [],
          }),
        ],
      }),
    );
    expect(signalPhysicalRange.check(net)).toHaveLength(0);
  });

  it('fires when min > max', () => {
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
            min: 100,
            max: 10,
            unit: '',
            receivers: [],
          }),
        ],
      }),
    );
    const issues = signalPhysicalRange.check(net);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.rule).toBe('signal.physical-range');
    expect(issues[0]!.severity).toBe('error');
  });
});
