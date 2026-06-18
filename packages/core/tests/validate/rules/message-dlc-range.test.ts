import { describe, it, expect } from 'vitest';

import { createMessage } from '../../../src/model/message.js';
import { createNetwork, addMessage } from '../../../src/model/network.js';
import { messageDlcRange } from '../../../src/validate/rules/message-dlc-range.js';

describe('message-dlc-range', () => {
  it('passes for dlc 0', () => {
    let net = createNetwork({ version: '1.0' });
    net = addMessage(net, createMessage({ id: 1, name: 'M', dlc: 0, transmitter: 'BCM' }));
    expect(messageDlcRange.check(net)).toHaveLength(0);
  });

  it('passes for dlc 8', () => {
    let net = createNetwork({ version: '1.0' });
    net = addMessage(net, createMessage({ id: 1, name: 'M', dlc: 8, transmitter: 'BCM' }));
    expect(messageDlcRange.check(net)).toHaveLength(0);
  });

  it('fires when dlc is negative', () => {
    let net = createNetwork({ version: '1.0' });
    net = addMessage(net, createMessage({ id: 1, name: 'M', dlc: -1, transmitter: 'BCM' }));
    const issues = messageDlcRange.check(net);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.rule).toBe('message.dlc-range');
    expect(issues[0]!.severity).toBe('error');
  });

  it('fires when dlc is greater than 8 (CAN classic)', () => {
    let net = createNetwork({ version: '1.0' });
    net = addMessage(net, createMessage({ id: 1, name: 'M', dlc: 9, transmitter: 'BCM' }));
    expect(messageDlcRange.check(net).length).toBeGreaterThan(0);
  });
});
