import { describe, it, expect } from 'vitest';

import { createMessage } from '../../../src/model/message.js';
import { createNetwork, addNode, addMessage } from '../../../src/model/network.js';
import { createNode } from '../../../src/model/node.js';
import { createSignal } from '../../../src/model/signal.js';
import { muxExtendedConsistency } from '../../../src/validate/rules/mux-extended-consistency.js';

describe('mux-extended-consistency', () => {
  it('passes when mux extension values match muxed signal values', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    const extMap = new Map<string, readonly number[]>([['A0', [1, 2]]]);
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
        ],
        muxExtensions: extMap,
      }),
    );
    expect(muxExtendedConsistency.check(net)).toHaveLength(0);
  });

  it('passes when message has no mux extensions', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({ id: 1, name: 'M', dlc: 8, transmitter: 'BCM' }));
    expect(muxExtendedConsistency.check(net)).toHaveLength(0);
  });
});
