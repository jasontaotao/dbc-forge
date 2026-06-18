import { describe, it, expect } from 'vitest';

import { createMessage } from '../../../src/model/message.js';
import { createNetwork, addNode, addMessage } from '../../../src/model/network.js';
import { createNode } from '../../../src/model/node.js';
import { createSignal } from '../../../src/model/signal.js';
import { signalBitRange } from '../../../src/validate/rules/signal-bit-range.js';

describe('signal-bit-range', () => {
  it('passes when startBit+length fits within dlc', () => {
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
            max: 255,
            unit: '',
            receivers: [],
          }),
        ],
      }),
    );
    expect(signalBitRange.check(net)).toHaveLength(0);
  });

  it('fires when signal exceeds dlc', () => {
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
            startBit: 60,
            length: 16,
            byteOrder: 'little-endian',
            valueType: 'unsigned',
            factor: 1,
            offset: 0,
            min: 0,
            max: 65535,
            unit: '',
            receivers: [],
          }),
        ],
      }),
    );
    const issues = signalBitRange.check(net);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.rule).toBe('signal.bit-range');
    expect(issues[0]!.severity).toBe('error');
    expect(issues[0]!.location.signalName).toBe('S');
  });
});
