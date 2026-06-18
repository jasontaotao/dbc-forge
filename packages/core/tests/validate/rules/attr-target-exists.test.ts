import { describe, it, expect } from 'vitest';

import { createMessage } from '../../../src/model/message.js';
import {
  createNetwork,
  addNode,
  addMessage,
  addAttributeAssignment,
  addAttributeDef,
} from '../../../src/model/network.js';
import { createNode } from '../../../src/model/node.js';
import { attrTargetExists } from '../../../src/validate/rules/attr-target-exists.js';

describe('attr-target-exists', () => {
  it('passes when targets resolve', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({ id: 1, name: 'M', dlc: 8, transmitter: 'BCM' }));
    net = addAttributeDef(net, { name: 'BusType', target: 'network', type: { kind: 'string' }, defaultValue: '' });
    net = addAttributeAssignment(net, { name: 'BusType', target: { kind: 'network' }, value: 'CAN' });
    net = addAttributeDef(net, { name: 'GenMsgCycleTime', target: 'message', type: { kind: 'int', min: 0, max: 65535 }, defaultValue: 0 });
    net = addAttributeAssignment(net, { name: 'GenMsgCycleTime', target: { kind: 'message', messageId: 1 }, value: 100 });
    expect(attrTargetExists.check(net)).toHaveLength(0);
  });

  it('fires when message target points at nonexistent id', () => {
    let net = createNetwork({ version: '1.0' });
    net = addAttributeDef(net, { name: 'GenMsgCycleTime', target: 'message', type: { kind: 'int', min: 0, max: 65535 }, defaultValue: 0 });
    net = addAttributeAssignment(net, { name: 'GenMsgCycleTime', target: { kind: 'message', messageId: 999 }, value: 100 });
    const issues = attrTargetExists.check(net);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.rule).toBe('attr.target-exists');
    expect(issues[0]!.severity).toBe('error');
  });

  it('fires when node target points at nonexistent node', () => {
    let net = createNetwork({ version: '1.0' });
    net = addAttributeDef(net, { name: 'NmStationAddress', target: 'node', type: { kind: 'int', min: 0, max: 255 }, defaultValue: 0 });
    net = addAttributeAssignment(net, { name: 'NmStationAddress', target: { kind: 'node', nodeName: 'Ghost' }, value: 1 });
    expect(attrTargetExists.check(net).length).toBeGreaterThan(0);
  });
});
