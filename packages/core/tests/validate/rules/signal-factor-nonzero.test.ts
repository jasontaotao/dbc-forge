import { describe, it, expect } from 'vitest';

import { createMessage } from '../../../src/model/message.js';
import {
  createNetwork,
  addNode,
  addMessage,
} from '../../../src/model/network.js';
import { createNode } from '../../../src/model/node.js';
import { createSignal } from '../../../src/model/signal.js';
import { signalFactorNonzero } from '../../../src/validate/rules/signal-factor-nonzero.js';

describe('signal-factor-nonzero', () => {
  it('passes for non-zero factor', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({
      id: 1, name: 'M', dlc: 8, transmitter: 'BCM',
      signals: [createSignal({
        name: 'S', startBit: 0, length: 8, byteOrder: 'little-endian',
        valueType: 'unsigned', factor: 0.1, offset: 0, min: 0, max: 255, unit: 'km/h', receivers: [],
      })],
    }));
    expect(signalFactorNonzero.check(net)).toHaveLength(0);
  });

  it('fires when factor is 0', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({
      id: 1, name: 'M', dlc: 8, transmitter: 'BCM',
      signals: [createSignal({
        name: 'S', startBit: 0, length: 8, byteOrder: 'little-endian',
        valueType: 'unsigned', factor: 0, offset: 0, min: 0, max: 255, unit: '', receivers: [],
      })],
    }));
    const issues = signalFactorNonzero.check(net);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.rule).toBe('signal.factor-nonzero');
    expect(issues[0]!.severity).toBe('error');
  });
});
