import { describe, it, expect } from 'vitest';

import { createMessage } from '../../../src/model/message.js';
import { createNetwork, addMessage } from '../../../src/model/network.js';
import { messageNameDuplicate } from '../../../src/validate/rules/message-name-duplicate.js';

describe('message-name-duplicate', () => {
  it('passes for unique names', () => {
    let net = createNetwork({ version: '1.0' });
    net = addMessage(net, createMessage({ id: 1, name: 'M1', dlc: 8, transmitter: 'BCM' }));
    net = addMessage(net, createMessage({ id: 2, name: 'M2', dlc: 8, transmitter: 'BCM' }));
    expect(messageNameDuplicate.check(net)).toHaveLength(0);
  });

  it('fires when two messages share a name', () => {
    let net = createNetwork({ version: '1.0' });
    net = addMessage(net, createMessage({ id: 1, name: 'M', dlc: 8, transmitter: 'BCM' }));
    net = addMessage(net, createMessage({ id: 2, name: 'M', dlc: 8, transmitter: 'BCM' }));
    const issues = messageNameDuplicate.check(net);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.rule).toBe('message.name-duplicate');
    expect(issues[0]!.severity).toBe('error');
  });
});
