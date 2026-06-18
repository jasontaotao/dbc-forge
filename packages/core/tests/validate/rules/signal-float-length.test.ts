import { describe, it, expect } from 'vitest';

import { createMessage } from '../../../src/model/message.js';
import {
  createNetwork,
  addNode,
  addMessage,
} from '../../../src/model/network.js';
import { createNode } from '../../../src/model/node.js';
import { createSignal } from '../../../src/model/signal.js';
import { signalFloatLength } from '../../../src/validate/rules/signal-float-length.js';

describe('signal-float-length', () => {
  it('passes for float with length 32', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({
      id: 1, name: 'M', dlc: 8, transmitter: 'BCM',
      signals: [createSignal({
        name: 'F', startBit: 0, length: 32, byteOrder: 'little-endian',
        valueType: 'float', factor: 1, offset: 0, min: 0, max: 1, unit: '', receivers: [],
      })],
    }));
    expect(signalFloatLength.check(net)).toHaveLength(0);
  });

  it('passes for double with length 64', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({
      id: 1, name: 'M', dlc: 8, transmitter: 'BCM',
      signals: [createSignal({
        name: 'D', startBit: 0, length: 64, byteOrder: 'little-endian',
        valueType: 'double', factor: 1, offset: 0, min: 0, max: 1, unit: '', receivers: [],
      })],
    }));
    expect(signalFloatLength.check(net)).toHaveLength(0);
  });

  it('fires when float length is not 32', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({
      id: 1, name: 'M', dlc: 8, transmitter: 'BCM',
      signals: [createSignal({
        name: 'F', startBit: 0, length: 16, byteOrder: 'little-endian',
        valueType: 'float', factor: 1, offset: 0, min: 0, max: 1, unit: '', receivers: [],
      })],
    }));
    const issues = signalFloatLength.check(net);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.rule).toBe('signal.float-length');
    expect(issues[0]!.severity).toBe('error');
  });

  it('fires when double length is not 64', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({
      id: 1, name: 'M', dlc: 8, transmitter: 'BCM',
      signals: [createSignal({
        name: 'D', startBit: 0, length: 32, byteOrder: 'little-endian',
        valueType: 'double', factor: 1, offset: 0, min: 0, max: 1, unit: '', receivers: [],
      })],
    }));
    expect(signalFloatLength.check(net).length).toBeGreaterThan(0);
  });
});
