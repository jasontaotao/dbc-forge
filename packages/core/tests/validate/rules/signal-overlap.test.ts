import { describe, it, expect } from 'vitest';

import { createMessage } from '../../../src/model/message.js';
import { createNetwork, addNode, addMessage } from '../../../src/model/network.js';
import { createNode } from '../../../src/model/node.js';
import { createSignal } from '../../../src/model/signal.js';
import { signalOverlap } from '../../../src/validate/rules/signal-overlap.js';

describe('signal-overlap', () => {
  it('passes when signals occupy disjoint bits', () => {
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
    expect(signalOverlap.check(net)).toHaveLength(0);
  });

  it('fires when two plain signals overlap', () => {
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
            startBit: 4,
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
    const issues = signalOverlap.check(net);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.rule).toBe('signal.overlap');
    expect(issues[0]!.severity).toBe('error');
  });

  it('passes when muxed signals in different buckets overlap', () => {
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
            name: 'Mux',
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
            multiplexed: 'Multiplexor',
          }),
          createSignal({
            name: 'A0',
            startBit: 8,
            length: 16,
            byteOrder: 'little-endian',
            valueType: 'unsigned',
            factor: 1,
            offset: 0,
            min: 0,
            max: 1,
            unit: '',
            receivers: [],
            multiplexed: { kind: 'Muxed', value: 0 },
          }),
          createSignal({
            name: 'A1',
            startBit: 8,
            length: 16,
            byteOrder: 'little-endian',
            valueType: 'unsigned',
            factor: 1,
            offset: 0,
            min: 0,
            max: 1,
            unit: '',
            receivers: [],
            multiplexed: { kind: 'Muxed', value: 1 },
          }),
        ],
      }),
    );
    expect(signalOverlap.check(net)).toHaveLength(0);
  });

  it('fires when muxed signals in same bucket overlap', () => {
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
            name: 'Mux',
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
            multiplexed: 'Multiplexor',
          }),
          createSignal({
            name: 'A0',
            startBit: 8,
            length: 16,
            byteOrder: 'little-endian',
            valueType: 'unsigned',
            factor: 1,
            offset: 0,
            min: 0,
            max: 1,
            unit: '',
            receivers: [],
            multiplexed: { kind: 'Muxed', value: 0 },
          }),
          createSignal({
            name: 'B0',
            startBit: 16,
            length: 8,
            byteOrder: 'little-endian',
            valueType: 'unsigned',
            factor: 1,
            offset: 0,
            min: 0,
            max: 1,
            unit: '',
            receivers: [],
            multiplexed: { kind: 'Muxed', value: 0 },
          }),
        ],
      }),
    );
    expect(signalOverlap.check(net).length).toBeGreaterThan(0);
  });
});
