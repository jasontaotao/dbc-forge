import { describe, it, expect } from 'vitest';

import { createMessage } from '../../../src/model/message.js';
import {
  createNetwork,
  addNode,
  addMessage,
} from '../../../src/model/network.js';
import { createNode } from '../../../src/model/node.js';
import { createSignal } from '../../../src/model/signal.js';
import { signalUnitWhenFactor } from '../../../src/validate/rules/signal-unit-when-factor.js';

describe('signal-unit-when-factor', () => {
  it('passes when unit is set', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({
      id: 1, name: 'M', dlc: 8, transmitter: 'BCM',
      signals: [createSignal({
        name: 'S', startBit: 0, length: 8, byteOrder: 'little-endian',
        valueType: 'unsigned', factor: 0.1, offset: 0, min: 0, max: 100, unit: 'km/h', receivers: [],
      })],
    }));
    expect(signalUnitWhenFactor.check(net)).toHaveLength(0);
  });

  it('passes when factor is 1 and offset is 0 even without unit', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({
      id: 1, name: 'M', dlc: 8, transmitter: 'BCM',
      signals: [createSignal({
        name: 'S', startBit: 0, length: 8, byteOrder: 'little-endian',
        valueType: 'unsigned', factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: [],
      })],
    }));
    expect(signalUnitWhenFactor.check(net)).toHaveLength(0);
  });

  it('fires (warning) when factor != 1 and unit is empty', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({
      id: 1, name: 'M', dlc: 8, transmitter: 'BCM',
      signals: [createSignal({
        name: 'S', startBit: 0, length: 8, byteOrder: 'little-endian',
        valueType: 'unsigned', factor: 0.1, offset: 0, min: 0, max: 100, unit: '', receivers: [],
      })],
    }));
    const issues = signalUnitWhenFactor.check(net);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.rule).toBe('signal.unit-when-factor');
    expect(issues[0]!.severity).toBe('warning');
  });
});
