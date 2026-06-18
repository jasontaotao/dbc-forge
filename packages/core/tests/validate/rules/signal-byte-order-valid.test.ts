import { describe, it, expect } from 'vitest';

import { createMessage } from '../../../src/model/message.js';
import { createNetwork, addNode, addMessage } from '../../../src/model/network.js';
import { createNode } from '../../../src/model/node.js';
import { createSignal } from '../../../src/model/signal.js';
import { signalByteOrderValid } from '../../../src/validate/rules/signal-byte-order-valid.js';

describe('signal-byte-order-valid', () => {
  it('passes for little-endian and big-endian', () => {
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
            name: 'A',
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
          createSignal({
            name: 'B',
            startBit: 8,
            length: 8,
            byteOrder: 'big-endian',
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
    expect(signalByteOrderValid.check(net)).toHaveLength(0);
  });

  it('never fires (type-system enforced)', () => {
    // The discriminated union makes invalid byteOrder unrepresentable, so this
    // rule is a structural guard that documents the constraint rather than
    // runtime detection. We assert it returns [] for any well-typed input.
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
            name: 'A',
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
    expect(signalByteOrderValid.check(net)).toHaveLength(0);
  });
});
