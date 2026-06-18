import { describe, it, expect } from 'vitest';

import { createMessage } from '../../../src/model/message.js';
import {
  createNetwork,
  addMessage,
} from '../../../src/model/network.js';
import { messageNameFormat } from '../../../src/validate/rules/message-name-format.js';

describe('message-name-format', () => {
  it('passes for valid message name', () => {
    let net = createNetwork({ version: '1.0' });
    net = addMessage(net, createMessage({ id: 1, name: 'Engine_1', dlc: 8, transmitter: 'BCM' }));
    expect(messageNameFormat.check(net)).toHaveLength(0);
  });

  it('fires when name starts with a digit', () => {
    let net = createNetwork({ version: '1.0' });
    net = addMessage(net, createMessage({ id: 1, name: '1Engine', dlc: 8, transmitter: 'BCM' }));
    const issues = messageNameFormat.check(net);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.rule).toBe('message.name-format');
    expect(issues[0]!.severity).toBe('error');
  });

  it('fires when name contains a space', () => {
    let net = createNetwork({ version: '1.0' });
    net = addMessage(net, createMessage({ id: 1, name: 'Engine 1', dlc: 8, transmitter: 'BCM' }));
    expect(messageNameFormat.check(net).length).toBeGreaterThan(0);
  });
});
