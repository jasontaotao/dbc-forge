import { describe, it, expect } from 'vitest';

import { createMessage } from '../../../src/model/message.js';
import { createNetwork, addNode, addMessage } from '../../../src/model/network.js';
import { createNode } from '../../../src/model/node.js';
import { createSignal } from '../../../src/model/signal.js';
import { muxSwitchRequiredWhenMux } from '../../../src/validate/rules/mux-switch-required-when-mux.js';

describe('mux-switch-required-when-mux', () => {
  it('passes when Muxed signal has Multiplexor', () => {
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
        ],
      }),
    );
    expect(muxSwitchRequiredWhenMux.check(net)).toHaveLength(0);
  });

  it('fires when Muxed signal exists without a Multiplexor', () => {
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
            name: 'A0',
            startBit: 0,
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
    const issues = muxSwitchRequiredWhenMux.check(net);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.rule).toBe('mux.switch-required-when-mux');
    expect(issues[0]!.severity).toBe('error');
  });
});
