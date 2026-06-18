import { describe, it, expect } from 'vitest';

import { createMessage } from '../../../src/model/message.js';
import {
  createNetwork,
  addNode,
  addMessage,
  addAttributeAssignment,
} from '../../../src/model/network.js';
import { createNode } from '../../../src/model/node.js';
import { messageCycleTimeRequired } from '../../../src/validate/rules/message-cycle-time-required.js';

describe('message-cycle-time-required', () => {
  it('passes when message has Cyclic send type and cycle time > 0', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({ id: 1, name: 'M', dlc: 8, transmitter: 'BCM' }));
    net = addAttributeAssignment(net, {
      name: 'GenMsgSendType',
      target: { kind: 'message', messageId: 1 },
      value: 'Cyclic',
    });
    net = addAttributeAssignment(net, {
      name: 'GenMsgCycleTime',
      target: { kind: 'message', messageId: 1 },
      value: 100,
    });
    expect(messageCycleTimeRequired.check(net)).toHaveLength(0);
  });

  it('fires when Cyclic message has cycle time 0', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({ id: 1, name: 'M', dlc: 8, transmitter: 'BCM' }));
    net = addAttributeAssignment(net, {
      name: 'GenMsgSendType',
      target: { kind: 'message', messageId: 1 },
      value: 'Cyclic',
    });
    net = addAttributeAssignment(net, {
      name: 'GenMsgCycleTime',
      target: { kind: 'message', messageId: 1 },
      value: 0,
    });
    const issues = messageCycleTimeRequired.check(net);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.rule).toBe('message.cycle-time-required');
    expect(issues[0]!.severity).toBe('error');
  });

  it('passes for NotUsed send type regardless of cycle time', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({ id: 1, name: 'M', dlc: 8, transmitter: 'BCM' }));
    net = addAttributeAssignment(net, {
      name: 'GenMsgSendType',
      target: { kind: 'message', messageId: 1 },
      value: 'NotUsed',
    });
    expect(messageCycleTimeRequired.check(net)).toHaveLength(0);
  });
});
