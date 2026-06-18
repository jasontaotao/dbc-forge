import { describe, it, expect } from 'vitest';

import { createMessage } from '../../../src/model/message.js';
import {
  createNetwork,
  addNode,
  addMessage,
} from '../../../src/model/network.js';
import { createNode } from '../../../src/model/node.js';
import { createSignal } from '../../../src/model/signal.js';
import { signalLengthPositive } from '../../../src/validate/rules/signal-length-positive.js';

describe('signal-length-positive', () => {
  it('passes for length > 0', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({
      id: 1, name: 'M', dlc: 8, transmitter: 'BCM',
      signals: [createSignal({
        name: 'S', startBit: 0, length: 8, byteOrder: 'little-endian',
        valueType: 'unsigned', factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: [],
      })],
    }));
    expect(signalLengthPositive.check(net)).toHaveLength(0);
  });

  it('fires when length is 0', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({
      id: 1, name: 'M', dlc: 8, transmitter: 'BCM',
      signals: [createSignal({
        name: 'S', startBit: 0, length: 0, byteOrder: 'little-endian',
        valueType: 'unsigned', factor: 1, offset: 0, min: 0, max: 0, unit: '', receivers: [],
      })],
    }));
    const issues = signalLengthPositive.check(net);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.rule).toBe('signal.length-positive');
    expect(issues[0]!.severity).toBe('error');
  });
});
