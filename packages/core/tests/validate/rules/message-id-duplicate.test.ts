import { describe, it, expect } from 'vitest';

import { createMessage } from '../../../src/model/message.js';
import { createNetwork, addMessage } from '../../../src/model/network.js';
import { messageIdDuplicate } from '../../../src/validate/rules/message-id-duplicate.js';

describe('message-id-duplicate', () => {
  it('passes for unique ids', () => {
    let net = createNetwork({ version: '1.0' });
    net = addMessage(net, createMessage({ id: 1, name: 'M1', dlc: 8, transmitter: 'BCM' }));
    net = addMessage(net, createMessage({ id: 2, name: 'M2', dlc: 8, transmitter: 'BCM' }));
    expect(messageIdDuplicate.check(net)).toHaveLength(0);
  });

  it('fires when two messages share an id', () => {
    let net = createNetwork({ version: '1.0' });
    net = addMessage(net, createMessage({ id: 1, name: 'M1', dlc: 8, transmitter: 'BCM' }));
    net = addMessage(net, createMessage({ id: 1, name: 'M2', dlc: 8, transmitter: 'BCM' }));
    const issues = messageIdDuplicate.check(net);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.rule).toBe('message.id-duplicate');
    expect(issues[0]!.severity).toBe('error');
    expect(issues[0]!.location.messageId).toBe(1);
  });
});
