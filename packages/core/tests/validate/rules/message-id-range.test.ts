import { describe, it, expect } from 'vitest';

import { createMessage } from '../../../src/model/message.js';
import { createNetwork, addMessage } from '../../../src/model/network.js';
import { messageIdRange } from '../../../src/validate/rules/message-id-range.js';

describe('message-id-range', () => {
  it('passes for valid CAN id (11-bit)', () => {
    let net = createNetwork({ version: '1.0' });
    net = addMessage(net, createMessage({ id: 0x7ff, name: 'M', dlc: 8, transmitter: 'BCM' }));
    expect(messageIdRange.check(net)).toHaveLength(0);
  });

  it('passes for valid CAN id (29-bit)', () => {
    let net = createNetwork({ version: '1.0' });
    net = addMessage(net, createMessage({ id: 0x1fffffff, name: 'M', dlc: 8, transmitter: 'BCM' }));
    expect(messageIdRange.check(net)).toHaveLength(0);
  });

  it('fires when id is negative', () => {
    let net = createNetwork({ version: '1.0' });
    net = addMessage(net, createMessage({ id: -1, name: 'M', dlc: 8, transmitter: 'BCM' }));
    const issues = messageIdRange.check(net);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.rule).toBe('message.id-range');
    expect(issues[0]!.severity).toBe('error');
  });

  it('fires when id exceeds 29-bit range', () => {
    let net = createNetwork({ version: '1.0' });
    net = addMessage(net, createMessage({ id: 0x20000000, name: 'M', dlc: 8, transmitter: 'BCM' }));
    expect(messageIdRange.check(net).length).toBeGreaterThan(0);
  });
});
