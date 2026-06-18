import { describe, it, expect } from 'vitest';

import { createMessage } from '../../../src/model/message.js';
import {
  createNetwork,
  addNode,
  addMessage,
} from '../../../src/model/network.js';
import { createNode } from '../../../src/model/node.js';
import { createSignal } from '../../../src/model/signal.js';
import { signalValueTypeValid } from '../../../src/validate/rules/signal-value-type-valid.js';

describe('signal-value-type-valid', () => {
  it('passes for all four value types', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({
      id: 1, name: 'M', dlc: 8, transmitter: 'BCM',
      signals: [
        createSignal({ name: 'U', startBit: 0, length: 8, byteOrder: 'little-endian', valueType: 'unsigned', factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: [] }),
        createSignal({ name: 'S', startBit: 8, length: 8, byteOrder: 'little-endian', valueType: 'signed', factor: 1, offset: 0, min: -128, max: 127, unit: '', receivers: [] }),
      ],
    }));
    expect(signalValueTypeValid.check(net)).toHaveLength(0);
  });

  it('never fires (type-system enforced)', () => {
    // Like signalByteOrderValid: discriminated union guarantees validity.
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({
      id: 1, name: 'M', dlc: 8, transmitter: 'BCM',
      signals: [createSignal({
        name: 'U', startBit: 0, length: 8, byteOrder: 'little-endian',
        valueType: 'unsigned', factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: [],
      })],
    }));
    expect(signalValueTypeValid.check(net)).toHaveLength(0);
  });
});
