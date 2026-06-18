import { describe, it, expect } from 'vitest';

import { createMessage } from '../../../src/model/message.js';
import {
  createNetwork,
  addNode,
  addMessage,
} from '../../../src/model/network.js';
import { createNode } from '../../../src/model/node.js';
import { createSignal } from '../../../src/model/signal.js';
import { signalNameDuplicateInMessage } from '../../../src/validate/rules/signal-name-duplicate-in-message.js';

describe('signal-name-duplicate-in-message', () => {
  it('passes when no duplicates within a message', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({
      id: 1, name: 'M', dlc: 8, transmitter: 'BCM',
      signals: [
        createSignal({ name: 'A', startBit: 0, length: 8, byteOrder: 'little-endian', valueType: 'unsigned', factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: [] }),
        createSignal({ name: 'B', startBit: 8, length: 8, byteOrder: 'little-endian', valueType: 'unsigned', factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: [] }),
      ],
    }));
    expect(signalNameDuplicateInMessage.check(net)).toHaveLength(0);
  });

  it('fires when two signals in same message share a name', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({
      id: 1, name: 'M', dlc: 8, transmitter: 'BCM',
      signals: [
        createSignal({ name: 'A', startBit: 0, length: 8, byteOrder: 'little-endian', valueType: 'unsigned', factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: [] }),
        createSignal({ name: 'A', startBit: 8, length: 8, byteOrder: 'little-endian', valueType: 'unsigned', factor: 1, offset: 0, min: 0, max: 255, unit: '', receivers: [] }),
      ],
    }));
    const issues = signalNameDuplicateInMessage.check(net);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.rule).toBe('signal.name-duplicate-in-message');
    expect(issues[0]!.severity).toBe('error');
  });
});
