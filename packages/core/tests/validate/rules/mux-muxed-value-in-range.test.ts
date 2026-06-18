import { describe, it, expect } from 'vitest';

import { createMessage } from '../../../src/model/message.js';
import { createNetwork, addNode, addMessage } from '../../../src/model/network.js';
import { createNode } from '../../../src/model/node.js';
import { createSignal } from '../../../src/model/signal.js';
import { muxMuxedValueInRange } from '../../../src/validate/rules/mux-muxed-value-in-range.js';

describe('mux-muxed-value-in-range', () => {
  it('passes when Muxed values fit within 2^switch.length', () => {
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
          createSignal({
            name: 'A255',
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
            multiplexed: { kind: 'Muxed', value: 255 },
          }),
        ],
      }),
    );
    expect(muxMuxedValueInRange.check(net)).toHaveLength(0);
  });

  it('fires when Muxed value is outside the range', () => {
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
            name: 'TooBig',
            startBit: 8,
            length: 8,
            byteOrder: 'little-endian',
            valueType: 'unsigned',
            factor: 1,
            offset: 0,
            min: 0,
            max: 1,
            unit: '',
            receivers: [],
            multiplexed: { kind: 'Muxed', value: 256 },
          }),
        ],
      }),
    );
    const issues = muxMuxedValueInRange.check(net);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.rule).toBe('mux.muxed-value-in-range');
    expect(issues[0]!.severity).toBe('error');
  });

  it('fires when Muxed value is negative', () => {
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
            name: 'Neg',
            startBit: 8,
            length: 8,
            byteOrder: 'little-endian',
            valueType: 'unsigned',
            factor: 1,
            offset: 0,
            min: 0,
            max: 1,
            unit: '',
            receivers: [],
            multiplexed: { kind: 'Muxed', value: -1 },
          }),
        ],
      }),
    );
    expect(muxMuxedValueInRange.check(net).length).toBeGreaterThan(0);
  });
});
