import { describe, it, expect } from 'vitest';

import { createMessage } from '../../../src/model/message.js';
import {
  createNetwork,
  addNode,
  addMessage,
} from '../../../src/model/network.js';
import { createNode } from '../../../src/model/node.js';
import { createSignal } from '../../../src/model/signal.js';
import { muxSwitchExactlyOne } from '../../../src/validate/rules/mux-switch-exactly-one.js';

describe('mux-switch-exactly-one', () => {
  it('passes with zero or one Multiplexor', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({
      id: 1, name: 'M', dlc: 8, transmitter: 'BCM',
      signals: [createSignal({
        name: 'S', startBit: 0, length: 8, byteOrder: 'little-endian',
        valueType: 'unsigned', factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: [],
      })],
    }));
    expect(muxSwitchExactlyOne.check(net)).toHaveLength(0);
  });

  it('fires when two Multiplexor signals exist in one message', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({
      id: 1, name: 'M', dlc: 8, transmitter: 'BCM',
      signals: [
        createSignal({ name: 'M1', startBit: 0, length: 8, byteOrder: 'little-endian', valueType: 'unsigned', factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: [], multiplexed: 'Multiplexor' }),
        createSignal({ name: 'M2', startBit: 8, length: 8, byteOrder: 'little-endian', valueType: 'unsigned', factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: [], multiplexed: 'Multiplexor' }),
      ],
    }));
    const issues = muxSwitchExactlyOne.check(net);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.rule).toBe('mux.switch-exactly-one');
    expect(issues[0]!.severity).toBe('error');
  });
});
