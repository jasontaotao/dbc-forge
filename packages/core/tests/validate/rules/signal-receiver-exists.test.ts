import { describe, it, expect } from 'vitest';

import { createMessage } from '../../../src/model/message.js';
import {
  createNetwork,
  addNode,
  addMessage,
} from '../../../src/model/network.js';
import { createNode } from '../../../src/model/node.js';
import { createSignal } from '../../../src/model/signal.js';
import { signalReceiverExists } from '../../../src/validate/rules/signal-receiver-exists.js';

describe('signal-receiver-exists', () => {
  it('passes when receiver is a known node', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addNode(net, createNode({ name: 'GW' }));
    net = addMessage(net, createMessage({
      id: 1, name: 'M', dlc: 8, transmitter: 'BCM',
      signals: [createSignal({
        name: 'S', startBit: 0, length: 8, byteOrder: 'little-endian',
        valueType: 'unsigned', factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: ['GW'],
      })],
    }));
    expect(signalReceiverExists.check(net)).toHaveLength(0);
  });

  it('passes when receiver matches Vector__XXX virtual pattern', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({
      id: 1, name: 'M', dlc: 8, transmitter: 'BCM',
      signals: [createSignal({
        name: 'S', startBit: 0, length: 8, byteOrder: 'little-endian',
        valueType: 'unsigned', factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: ['Vector__XXX'],
      })],
    }));
    expect(signalReceiverExists.check(net)).toHaveLength(0);
  });

  it('fires when receiver is an unknown node', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({
      id: 1, name: 'M', dlc: 8, transmitter: 'BCM',
      signals: [createSignal({
        name: 'S', startBit: 0, length: 8, byteOrder: 'little-endian',
        valueType: 'unsigned', factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: ['Ghost'],
      })],
    }));
    const issues = signalReceiverExists.check(net);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.rule).toBe('signal.receiver-exists');
    expect(issues[0]!.severity).toBe('error');
  });
});
