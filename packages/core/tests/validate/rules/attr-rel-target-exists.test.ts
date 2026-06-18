import { describe, it, expect } from 'vitest';

import { createMessage } from '../../../src/model/message.js';
import {
  createNetwork,
  addNode,
  addMessage,
  addRelationAttributeAssignment,
  addRelationAttributeDef,
} from '../../../src/model/network.js';
import { createNode } from '../../../src/model/node.js';
import { createSignal } from '../../../src/model/signal.js';
import { attrRelTargetExists } from '../../../src/validate/rules/attr-rel-target-exists.js';

describe('attr-rel-target-exists', () => {
  it('passes when relation target exists', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addNode(net, createNode({ name: 'GW' }));
    net = addMessage(
      net,
      createMessage({
        id: 1,
        name: 'M',
        dlc: 8,
        transmitter: 'BCM',
        signals: [
          createSignal({
            name: 'S',
            startBit: 0,
            length: 8,
            byteOrder: 'little-endian',
            valueType: 'unsigned',
            factor: 1,
            offset: 0,
            min: 0,
            max: 1,
            unit: '',
            receivers: ['GW'],
          }),
        ],
      }),
    );
    net = addRelationAttributeDef(net, {
      name: 'GenSigTimeoutTime',
      target: 'node-signal',
      type: { kind: 'int', min: 0, max: 65535 },
      defaultValue: 0,
    });
    net = addRelationAttributeAssignment(net, {
      name: 'GenSigTimeoutTime',
      target: { kind: 'node-signal', nodeName: 'GW', messageId: 1, signalName: 'S' },
      value: 100,
    });
    expect(attrRelTargetExists.check(net)).toHaveLength(0);
  });

  it('fires when relation target points at nonexistent message', () => {
    let net = createNetwork({ version: '1.0' });
    net = addRelationAttributeDef(net, {
      name: 'GenSigTimeoutTime',
      target: 'node-signal',
      type: { kind: 'int', min: 0, max: 65535 },
      defaultValue: 0,
    });
    net = addRelationAttributeAssignment(net, {
      name: 'GenSigTimeoutTime',
      target: { kind: 'node-signal', nodeName: 'GW', messageId: 999, signalName: 'S' },
      value: 100,
    });
    const issues = attrRelTargetExists.check(net);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.rule).toBe('attr.rel-target-exists');
    expect(issues[0]!.severity).toBe('error');
  });
});
