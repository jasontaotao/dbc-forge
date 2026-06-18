import { describe, it, expect } from 'vitest';

import { createMessage } from '../../../src/model/message.js';
import { createNetwork, addNode, addMessage } from '../../../src/model/network.js';
import { createNode } from '../../../src/model/node.js';
import { messageTransmitterExists } from '../../../src/validate/rules/message-transmitter-exists.js';

describe('message-transmitter-exists', () => {
  it('passes when transmitter is a known node', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({ id: 1, name: 'M', dlc: 8, transmitter: 'BCM' }));
    expect(messageTransmitterExists.check(net)).toHaveLength(0);
  });

  it('fires when transmitter is an unknown node', () => {
    let net = createNetwork({ version: '1.0' });
    net = addMessage(net, createMessage({ id: 1, name: 'M', dlc: 8, transmitter: 'Ghost' }));
    const issues = messageTransmitterExists.check(net);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.rule).toBe('message.transmitter-exists');
    expect(issues[0]!.severity).toBe('error');
  });
});
