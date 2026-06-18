import { describe, it, expect } from 'vitest';

import { createMessage } from '../../../src/model/message.js';
import {
  createNetwork,
  addNode,
  addMessage,
} from '../../../src/model/network.js';
import { createNode } from '../../../src/model/node.js';
import { nodeUnreferenced } from '../../../src/validate/rules/node-unreferenced.js';

describe('node-unreferenced', () => {
  it('fires when a node is not used anywhere', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'Orphan' }));
    const issues = nodeUnreferenced.check(net);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.rule).toBe('node.unreferenced');
    expect(issues[0]!.severity).toBe('warning');
    expect(issues[0]!.location.nodeName).toBe('Orphan');
  });

  it('passes when node is used as a transmitter', () => {
    let net = createNetwork({ version: '1.0' });
    net = addNode(net, createNode({ name: 'BCM' }));
    net = addMessage(net, createMessage({ id: 1, name: 'M', dlc: 8, transmitter: 'BCM' }));
    expect(nodeUnreferenced.check(net)).toHaveLength(0);
  });
});
